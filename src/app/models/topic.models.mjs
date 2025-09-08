// models/Topic.js
// MongoDB Topic/Keywords Model for Social Media Monitoring System

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// ========================================
// TOPIC/KEYWORDS MODEL
// ========================================
const TopicSchema = new Schema({
  // Topic identification
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  category: {
    type: String,
    enum: [
      'politics', 'health', 'technology', 'social_issues', 
      'economy', 'environment', 'education', 'security', 
      'entertainment', 'sports', 'other'
    ],
    required: true,
    index: true
  },

  // Keywords and monitoring rules
  keywords: {
    // Exact phrase matches (must appear exactly as written)
    exact: [{
      text: {
        type: String,
        required: true,
        trim: true
      },
      weight: {
        type: Number,
        default: 1,
        min: 0.1,
        max: 10
      },
      caseSensitive: {
        type: Boolean,
        default: false
      }
    }],
    
    // Any of these words (OR logic)
    any: [{
      text: {
        type: String,
        required: true,
        trim: true
      },
      weight: {
        type: Number,
        default: 1,
        min: 0.1,
        max: 10
      }
    }],
    
    // All of these words must be present (AND logic)
    all: [{
      text: {
        type: String,
        required: true,
        trim: true
      },
      weight: {
        type: Number,
        default: 1,
        min: 0.1,
        max: 10
      }
    }],
    
    // None of these words should be present (NOT logic)
    exclude: [{
      text: {
        type: String,
        required: true,
        trim: true
      }
    }],
    
    // Regular expressions for advanced matching
    regex: [{
      pattern: {
        type: String,
        required: true
      },
      flags: {
        type: String,
        default: 'i' // case insensitive by default
      },
      weight: {
        type: Number,
        default: 1,
        min: 0.1,
        max: 10
      }
    }]
  },

  // Hashtag monitoring
  hashtags: [{
    tag: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    weight: {
      type: Number,
      default: 1,
      min: 0.1,
      max: 10
    }
  }],

  // Author/page specific monitoring
  authors: [{
    authorId: {
      type: String,
      required: true
    },
    authorName: String,
    weight: {
      type: Number,
      default: 1,
      min: 0.1,
      max: 10
    },
    includeShares: {
      type: Boolean,
      default: true
    }
  }],

  // Geographic filters
  geographic: {
    countries: [String],
    regions: [String],
    cities: [String],
    radius: { // For coordinate-based filtering
      center: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      },
      distance: Number // in kilometers
    }
  },

  // Time-based filters
  timeFilters: {
    activeHours: {
      start: {
        type: Number,
        min: 0,
        max: 23
      },
      end: {
        type: Number,
        min: 0,
        max: 23
      }
    },
    activeDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    dateRange: {
      start: Date,
      end: Date
    }
  },

  // Alert settings
  alertSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    
    // Risk level thresholds
    riskThresholds: {
      yellow: {
        type: Number,
        default: 40,
        min: 0,
        max: 100
      },
      red: {
        type: Number,
        default: 70,
        min: 0,
        max: 100
      }
    },
    
    // Engagement-based alerts
    viralityThreshold: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: {
        type: Number,
        default: 1000 // engagements per hour
      },
      timeWindow: {
        type: Number,
        default: 1 // hours
      }
    },
    
    // Volume-based alerts
    volumeAlert: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: {
        type: Number,
        default: 50 // posts per hour
      },
      timeWindow: {
        type: Number,
        default: 1 // hours
      }
    },
    
    // Notification settings
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        recipients: [String],
        frequency: {
          type: String,
          enum: ['immediate', 'hourly', 'daily'],
          default: 'immediate'
        }
      },
      webhook: {
        enabled: {
          type: Boolean,
          default: false
        },
        url: String,
        secret: String
      }
    }
  },

  // Processing settings
  processingSettings: {
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    
    // Analysis depth
    analysisLevel: {
      type: String,
      enum: ['basic', 'standard', 'comprehensive'],
      default: 'standard'
    },
    
    // Language processing
    languages: [{
      type: String,
      default: ['en', 'fr'] // English and French by default
    }],
    
    // Content filters
    mediaAnalysis: {
      enabled: {
        type: Boolean,
        default: true
      },
      imageAnalysis: {
        type: Boolean,
        default: true
      },
      videoAnalysis: {
        type: Boolean,
        default: false // Computationally expensive
      }
    },
    
    // Minimum engagement for processing
    minEngagement: {
      type: Number,
      default: 0
    }
  },

  // Topic statistics
  statistics: {
    totalPosts: {
      type: Number,
      default: 0
    },
    lastMatch: Date,
    averageRiskLevel: Number,
    
    // Performance metrics
    falsePositiveRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    precisionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    
    // Weekly statistics
    weeklyStats: [{
      week: Date,
      postsMatched: Number,
      riskDistribution: {
        GREEN: Number,
        YELLOW: Number,
        RED: Number
      },
      topAuthors: [String],
      avgEngagement: Number
    }]
  },

  // Topic status and management
  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active',
    index: true
  },
  
  // Access control
  visibility: {
    type: String,
    enum: ['public', 'private', 'shared'],
    default: 'private'
  },
  
  // Ownership and permissions
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  sharedWith: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: [{
      type: String,
      enum: ['view', 'edit', 'delete', 'manage_alerts']
    }],
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Version control
  version: {
    type: Number,
    default: 1
  },
  
  previousVersions: [{
    version: Number,
    changes: String,
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    snapshot: Schema.Types.Mixed // Store previous state
  }],

  // Machine learning optimization
  mlOptimization: {
    enabled: {
      type: Boolean,
      default: false
    },
    
    // Auto-adjustment of keyword weights based on performance
    autoTuning: {
      enabled: {
        type: Boolean,
        default: false
      },
      learningRate: {
        type: Number,
        default: 0.1,
        min: 0.01,
        max: 1
      },
      lastOptimized: Date
    },
    
    // Suggested keywords based on matched content
    suggestedKeywords: [{
      text: String,
      confidence: Number,
      frequency: Number,
      suggestedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      }
    }]
  }
}, {
  timestamps: true,
  collection: 'topics'
});

// Indexes
TopicSchema.index({ 'name': 1, 'status': 1 });
TopicSchema.index({ 'category': 1, 'status': 1 });
TopicSchema.index({ 'createdBy': 1, 'visibility': 1 });
TopicSchema.index({ 'alertSettings.enabled': 1 });

// Text search index
TopicSchema.index({
  'name': 'text',
  'keywords.exact.text': 'text',
  'keywords.any.text': 'text',
  'keywords.all.text': 'text'
});

// Geographic index
TopicSchema.index({ 'geographic.radius.center': '2dsphere' });

// ========================================
// METHODS
// ========================================

// Instance methods
TopicSchema.methods.updateStatistics = async function() {
  const Post = model('Post');
  const Analysis = model('Analysis');
  
  // Count total posts for this topic
  this.statistics.totalPosts = await Post.countDocuments({
    monitoringTopics: this._id,
    status: 'active'
  });
  
  // Get last match date
  const lastPost = await Post.findOne(
    { monitoringTopics: this._id },
    { 'metadata.timestamp': 1 }
  ).sort({ 'metadata.timestamp': -1 });
  
  if (lastPost) {
    this.statistics.lastMatch = lastPost.metadata.timestamp;
  }
  
  // Calculate average risk level
  const riskAggregation = await Analysis.aggregate([
    {
      $lookup: {
        from: 'posts',
        localField: 'postId',
        foreignField: 'postId',
        as: 'post'
      }
    },
    {
      $match: {
        'post.monitoringTopics': this._id
      }
    },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$overallScore' }
      }
    }
  ]);
  
  if (riskAggregation.length > 0) {
    this.statistics.averageRiskLevel = riskAggregation[0].avgScore;
  }
  
  return this.statistics;
};

TopicSchema.methods.matchesContent = function(content) {
  let score = 0;
  const text = content.toLowerCase();
  
  // Check exact matches
  for (const exact of this.keywords.exact) {
    const searchText = exact.caseSensitive ? content : text;
    const keyword = exact.caseSensitive ? exact.text : exact.text.toLowerCase();
    
    if (searchText.includes(keyword)) {
      score += exact.weight;
    }
  }
  
  // Check ANY matches (OR logic)
  const anyMatches = this.keywords.any.filter(any => 
    text.includes(any.text.toLowerCase())
  );
  if (anyMatches.length > 0) {
    score += Math.max(...anyMatches.map(match => match.weight));
  }
  
  // Check ALL matches (AND logic)
  const allMatches = this.keywords.all.every(all => 
    text.includes(all.text.toLowerCase())
  );
  if (allMatches && this.keywords.all.length > 0) {
    score += this.keywords.all.reduce((sum, all) => sum + all.weight, 0);
  }
  
  // Check exclusions
  const hasExclusions = this.keywords.exclude.some(exclude => 
    text.includes(exclude.text.toLowerCase())
  );
  if (hasExclusions) {
    return 0; // Excluded content gets 0 score
  }
  
  // Check regex patterns
  for (const regex of this.keywords.regex) {
    try {
      const pattern = new RegExp(regex.pattern, regex.flags);
      if (pattern.test(content)) {
        score += regex.weight;
      }
    } catch (e) {
      // Invalid regex pattern, skip
      continue;
    }
  }
  
  return score;
};

TopicSchema.methods.addVersion = function(changes, changedBy) {
  this.previousVersions.push({
    version: this.version,
    changes: changes,
    changedBy: changedBy,
    changedAt: new Date(),
    snapshot: this.toObject()
  });
  
  this.version += 1;
  
  // Keep only last 10 versions
  if (this.previousVersions.length > 10) {
    this.previousVersions = this.previousVersions.slice(-10);
  }
};

// Static methods
TopicSchema.statics.findActiveTopics = function() {
  return this.find({ 
    status: 'active',
    'alertSettings.enabled': true 
  });
};

TopicSchema.statics.findByCategory = function(category, includeStats = false) {
  const query = this.find({ category, status: 'active' });
  
  if (includeStats) {
    return query.select('+statistics');
  }
  
  return query;
};

TopicSchema.statics.getTopicPerformance = function(topicId, timeRange = 30) {
  const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: { _id: mongoose.Types.ObjectId(topicId) }
    },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'monitoringTopics',
        as: 'posts'
      }
    },
    {
      $lookup: {
        from: 'analyses',
        localField: 'posts.postId',
        foreignField: 'postId',
        as: 'analyses'
      }
    },
    {
      $project: {
        name: 1,
        category: 1,
        recentPosts: {
          $size: {
            $filter: {
              input: '$posts',
              cond: {
                $gte: ['$this.metadata.timestamp', startDate]
              }
            }
          }
        },
        riskDistribution: {
          $reduce: {
            input: '$analyses',
            initialValue: { RED: 0, YELLOW: 0, GREEN: 0 },
            in: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$this.riskLevel', 'RED'] },
                    then: {
                      RED: { $add: ['$value.RED', 1] },
                      YELLOW: '$value.YELLOW',
                      GREEN: '$value.GREEN'
                    }
                  },
                  {
                    case: { $eq: ['$this.riskLevel', 'YELLOW'] },
                    then: {
                      RED: '$value.RED',
                      YELLOW: { $add: ['$value.YELLOW', 1] },
                      GREEN: '$value.GREEN'
                    }
                  }
                ],
                default: {
                  RED: '$value.RED',
                  YELLOW: '$value.YELLOW',
                  GREEN: { $add: ['$value.GREEN', 1] }
                }
              }
            }
          }
        },
        avgRiskScore: { $avg: '$analyses.overallScore' }
      }
    }
  ]);
};

// ========================================
// MIDDLEWARE HOOKS
// ========================================

// Pre-save middleware
TopicSchema.pre('save', function(next) {
  // Normalize hashtags
  if (this.hashtags && this.hashtags.length > 0) {
    this.hashtags = this.hashtags.map(hashtag => ({
      ...hashtag,
      tag: hashtag.tag.replace('#', '').toLowerCase().trim()
    }));
  }
  
  // Validate regex patterns
  if (this.keywords && this.keywords.regex) {
    for (const regex of this.keywords.regex) {
      try {
        new RegExp(regex.pattern, regex.flags);
      } catch (e) {
        return next(new Error(`Invalid regex pattern: ${regex.pattern}`));
      }
    }
  }
  
  next();
});

// Post-save middleware
TopicSchema.post('save', async function(doc) {
  // Update statistics when topic is saved
  if (this.isNew || this.isModified('keywords') || this.isModified('hashtags')) {
    // Trigger re-analysis of posts that might now match this topic
    // This would typically be handled by a background job
    console.log(`Topic ${doc.name} updated, consider re-analysis of posts`);
  }
});

 const Topic = model('Topic', TopicSchema);
export default Topic;