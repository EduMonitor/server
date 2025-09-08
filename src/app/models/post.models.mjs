// models/Post.js
// MongoDB Post Model for Social Media Monitoring System

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// ========================================
// POST MODEL
// ========================================
const PostSchema = new Schema({
  // Facebook post identification
  postId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  facebookPostId: String,
  
  // Content
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 10000
    },
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'link', 'document'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      thumbnailUrl: String,
      description: String,
      metadata: {
        width: Number,
        height: Number,
        duration: Number, // for videos
        fileSize: Number,
        format: String
      }
    }],
    hashtags: [String],
    mentions: [String],
    urls: [{
      original: String,
      expanded: String,
      domain: String
    }]
  },

  // Post metadata
  metadata: {
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    authorId: {
      type: String,
      required: true,
      index: true
    },
    authorName: String,
    authorType: {
      type: String,
      enum: ['user', 'page', 'group'],
      default: 'user'
    },
    language: {
      type: String,
      default: 'unknown'
    },
    platform: {
      type: String,
      default: 'facebook'
    }
  },

  // Engagement metrics
  engagement: {
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },
    reactions: {
      love: { type: Number, default: 0 },
      haha: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      angry: { type: Number, default: 0 }
    },
    engagementRate: {
      type: Number,
      default: 0
    },
    viralityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Geographic and targeting info
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },

  // Monitoring categorization
  monitoringTopics: [{
    type: Schema.Types.ObjectId,
    ref: 'Topic',
    index: true
  }],
  
  // Post status
  status: {
    type: String,
    enum: ['active', 'deleted', 'hidden', 'flagged'],
    default: 'active',
    index: true
  },

  // Processing flags
  processingFlags: {
    analyzed: {
      type: Boolean,
      default: false,
      index: true
    },
    needsReanalysis: {
      type: Boolean,
      default: false
    },
    lastProcessed: Date,
    processingErrors: [String]
  }
}, {
  timestamps: true,
  collection: 'posts'
});

// Indexes
PostSchema.index({ 'metadata.timestamp': -1, 'status': 1 });
PostSchema.index({ 'metadata.authorId': 1, 'metadata.timestamp': -1 });
PostSchema.index({ 'engagement.viralityScore': -1 });
PostSchema.index({ 'processingFlags.analyzed': 1, 'processingFlags.needsReanalysis': 1 });

// Multi-field indexes for common queries
PostSchema.index({ 
  'monitoringTopics': 1, 
  'metadata.timestamp': -1, 
  'status': 1 
});

PostSchema.index({ 
  'location.region': 1, 
  'metadata.timestamp': -1,
  'status': 1
});

PostSchema.index({
  'engagement.viralityScore': -1,
  'metadata.timestamp': -1
});

// Text search indexes
PostSchema.index({
  'content.text': 'text',
  'metadata.authorName': 'text'
});

// ========================================
// METHODS
// ========================================

// Instance methods
PostSchema.methods.calculateViralityScore = function() {
  const engagement = this.engagement;
  const totalEngagement = engagement.likes + engagement.shares + engagement.comments;
  const ageInHours = (Date.now() - this.metadata.timestamp) / (1000 * 60 * 60);
  
  // Virality score based on engagement rate over time
  this.engagement.viralityScore = Math.min(100, (totalEngagement / Math.max(ageInHours, 1)) * 10);
  return this.engagement.viralityScore;
};

// Static methods
PostSchema.statics.findByRiskLevel = function(riskLevel, limit = 50) {
  return this.aggregate([
    {
      $lookup: {
        from: 'analyses',
        localField: 'postId',
        foreignField: 'postId',
        as: 'analysis'
      }
    },
    {
      $match: {
        'analysis.riskLevel': riskLevel,
        status: 'active'
      }
    },
    {
      $sort: { 'metadata.timestamp': -1 }
    },
    {
      $limit: limit
    }
  ]);
};

PostSchema.statics.getTrendingPosts = function(timeWindow = 24) {
  const startDate = new Date(Date.now() - (timeWindow * 60 * 60 * 1000));
  
  return this.find({
    'metadata.timestamp': { $gte: startDate },
    status: 'active'
  }).sort({
    'engagement.viralityScore': -1,
    'engagement.shares': -1
  }).limit(20);
};

PostSchema.statics.getGeographicDistribution = function(timeRange = 7) {
  const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        'metadata.timestamp': { $gte: startDate },
        'location.region': { $exists: true },
        status: 'active'
      }
    },
    {
      $lookup: {
        from: 'analyses',
        localField: 'postId',
        foreignField: 'postId',
        as: 'analysis'
      }
    },
    {
      $group: {
        _id: '$location.region',
        count: { $sum: 1 },
        riskLevels: { $push: '$analysis.riskLevel' },
        avgEngagement: {
          $avg: {
            $add: [
              '$engagement.likes',
              '$engagement.shares',
              '$engagement.comments'
            ]
          }
        }
      }
    },
    {
      $project: {
        region: '$_id',
        count: 1,
        avgEngagement: { $round: ['$avgEngagement', 0] },
        riskDistribution: {
          RED: {
            $size: {
              $filter: {
                input: '$riskLevels',
                cond: { $eq: ['$this', 'RED'] }
              }
            }
          },
          YELLOW: {
            $size: {
              $filter: {
                input: '$riskLevels',
                cond: { $eq: ['$this', 'YELLOW'] }
              }
            }
          },
          GREEN: {
            $size: {
              $filter: {
                input: '$riskLevels',
                cond: { $eq: ['$this', 'GREEN'] }
              }
            }
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// ========================================
// MIDDLEWARE HOOKS
// ========================================

// Pre-save middleware
PostSchema.pre('save', function(next) {
  // Update virality score before saving
  this.calculateViralityScore();
  next();
});

// Post-save middleware
PostSchema.post('save', async function(doc) {
  // Update author statistics when a new post is saved
  if (this.isNew) {
    const Author = model('Author');
    await Author.findOneAndUpdate(
      { facebookId: doc.metadata.authorId },
      { 
        $inc: { 'statistics.totalPosts': 1 },
        $set: { 'statistics.lastPostDate': doc.metadata.timestamp }
      },
      { upsert: true }
    );
  }
});

const Post = model('Post', PostSchema);
export default Post;