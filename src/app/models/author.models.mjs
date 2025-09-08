// models/Author.js
// MongoDB Author/Pages Model for Social Media Monitoring System

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// ========================================
// AUTHORS/PAGES MODEL
// ========================================
const AuthorSchema = new Schema({
  // Facebook identifiers
  facebookId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: String,
  type: {
    type: String,
    enum: ['user', 'page', 'group'],
    required: true,
    index: true
  },

  // Profile information
  profile: {
    verified: {
      type: Boolean,
      default: false
    },
    followers: {
      type: Number,
      default: 0,
      min: 0
    },
    following: {
      type: Number,
      default: 0,
      min: 0
    },
    description: String,
    location: String,
    website: String,
    profilePictureUrl: String,
    coverPhotoUrl: String,
    createdDate: Date,
    category: String // For pages
  },

  // Credibility scoring
  credibilityScore: {
    overall: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    factors: {
      verificationStatus: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      historicalAccuracy: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
      },
      engagementQuality: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
      },
      reportHistory: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
      },
      accountAge: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
      }
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    },
    calculationMethod: {
      type: String,
      default: 'weighted_average'
    }
  },

  // Activity statistics
  statistics: {
    totalPosts: {
      type: Number,
      default: 0
    },
    hateSpeechPosts: {
      type: Number,
      default: 0
    },
    disinformationPosts: {
      type: Number,
      default: 0
    },
    averageEngagement: {
      type: Number,
      default: 0
    },
    lastPostDate: Date,
    mostActiveTopics: [String],
    riskHistory: [{
      date: {
        type: Date,
        default: Date.now
      },
      riskLevel: {
        type: String,
        enum: ['GREEN', 'YELLOW', 'RED']
      },
      reason: String,
      postId: String
    }]
  },

  // Moderation flags
  flags: {
    isBlacklisted: {
      type: Boolean,
      default: false,
      index: true
    },
    isWhitelisted: {
      type: Boolean,
      default: false,
      index: true
    },
    requiresManualReview: {
      type: Boolean,
      default: false
    },
    isSuspicious: {
      type: Boolean,
      default: false
    },
    reasons: [String],
    flaggedBy: [{
      userId: Schema.Types.ObjectId,
      reason: String,
      flaggedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Network analysis
  networkMetrics: {
    influenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    reachEstimate: Number,
    connectionStrength: Number,
    communityDetection: [String]
  }
}, {
  timestamps: true,
  collection: 'authors'
});

// Indexes
AuthorSchema.index({ 'credibilityScore.overall': -1 });
AuthorSchema.index({ 'statistics.totalPosts': -1 });
AuthorSchema.index({ 'flags.isBlacklisted': 1, 'flags.isWhitelisted': 1 });

// Compound indexes for performance
AuthorSchema.index({
  'credibilityScore.overall': -1,
  'statistics.totalPosts': -1,
  'flags.isBlacklisted': 1
});

// ========================================
// METHODS
// ========================================

// Instance methods
AuthorSchema.methods.updateCredibilityScore = function() {
  const factors = this.credibilityScore.factors;
  const weights = {
    verificationStatus: 0.25,
    historicalAccuracy: 0.30,
    engagementQuality: 0.20,
    reportHistory: 0.15,
    accountAge: 0.10
  };
  
  this.credibilityScore.overall = Math.round(
    (factors.verificationStatus * weights.verificationStatus) +
    (factors.historicalAccuracy * weights.historicalAccuracy) +
    (factors.engagementQuality * weights.engagementQuality) +
    (factors.reportHistory * weights.reportHistory) +
    (factors.accountAge * weights.accountAge)
  );
  
  this.credibilityScore.lastCalculated = new Date();
  return this.credibilityScore.overall;
};

AuthorSchema.methods.addRiskEvent = function(riskLevel, reason, postId) {
  this.statistics.riskHistory.push({
    date: new Date(),
    riskLevel,
    reason,
    postId
  });
  
  // Keep only last 50 entries
  if (this.statistics.riskHistory.length > 50) {
    this.statistics.riskHistory = this.statistics.riskHistory.slice(-50);
  }
  
  // Update suspicious flag if multiple high-risk events
  const recentHighRisk = this.statistics.riskHistory
    .filter(event => {
      const daysSince = (Date.now() - event.date) / (1000 * 60 * 60 * 24);
      return daysSince <= 30 && event.riskLevel === 'RED';
    }).length;
  
  this.flags.isSuspicious = recentHighRisk >= 3;
};

AuthorSchema.methods.calculateInfluenceScore = function() {
  const followers = this.profile.followers || 0;
  const avgEngagement = this.statistics.averageEngagement || 0;
  const totalPosts = this.statistics.totalPosts || 0;
  const credibility = this.credibilityScore.overall || 50;
  
  // Influence score based on reach, engagement, activity, and credibility
  const reachScore = Math.min(40, Math.log10(followers + 1) * 10);
  const engagementScore = Math.min(30, avgEngagement / 1000 * 100);
  const activityScore = Math.min(20, totalPosts / 100 * 20);
  const credibilityWeight = credibility / 100 * 10;
  
  this.networkMetrics.influenceScore = Math.round(
    reachScore + engagementScore + activityScore + credibilityWeight
  );
  
  return this.networkMetrics.influenceScore;
};

// Static methods
AuthorSchema.statics.getTopRiskyAuthors = function(limit = 20, timeRange = 30) {
  const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $lookup: {
        from: 'posts',
        localField: 'facebookId',
        foreignField: 'metadata.authorId',
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
      $match: {
        'posts.metadata.timestamp': { $gte: startDate },
        'analyses.riskLevel': { $in: ['YELLOW', 'RED'] }
      }
    },
    {
      $project: {
        name: 1,
        type: 1,
        credibilityScore: 1,
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
        riskScore: { $avg: '$analyses.overallScore' },
        redAlerts: {
          $size: {
            $filter: {
              input: '$analyses',
              cond: { $eq: ['$this.riskLevel', 'RED'] }
            }
          }
        }
      }
    },
    {
      $match: {
        recentPosts: { $gte: 1 }
      }
    },
    {
      $sort: { 
        riskScore: -1,
        redAlerts: -1,
        recentPosts: -1
      }
    },
    {
      $limit: limit
    }
  ]);
};

AuthorSchema.statics.getCredibilityDistribution = function() {
  return this.aggregate([
    {
      $bucket: {
        groupBy: '$credibilityScore.overall',
        boundaries: [0, 25, 50, 75, 100],
        default: 'unknown',
        output: {
          count: { $sum: 1 },
          averageInfluence: { $avg: '$networkMetrics.influenceScore' },
          totalPosts: { $sum: '$statistics.totalPosts' }
        }
      }
    }
  ]);
};

AuthorSchema.statics.findSuspiciousAccounts = function() {
  return this.find({
    $or: [
      { 'flags.isSuspicious': true },
      { 'credibilityScore.overall': { $lt: 25 } },
      { 
        'statistics.hateSpeechPosts': { $gt: 0 },
        'statistics.disinformationPosts': { $gt: 0 }
      }
    ],
    'flags.isBlacklisted': { $ne: true }
  }).sort({ 'credibilityScore.overall': 1 });
};

AuthorSchema.statics.getInfluentialAuthors = function(minInfluence = 70, limit = 50) {
  return this.find({
    'networkMetrics.influenceScore': { $gte: minInfluence },
    'flags.isBlacklisted': { $ne: true }
  })
  .sort({ 'networkMetrics.influenceScore': -1 })
  .limit(limit)
  .select('name type profile.followers credibilityScore networkMetrics');
};

AuthorSchema.statics.getAuthorStatistics = function(timeRange = 30) {
  const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $facet: {
        // Overall statistics
        overall: [
          {
            $group: {
              _id: null,
              totalAuthors: { $sum: 1 },
              verifiedAuthors: {
                $sum: { $cond: ['$profile.verified', 1, 0] }
              },
              blacklistedAuthors: {
                $sum: { $cond: ['$flags.isBlacklisted', 1, 0] }
              },
              suspiciousAuthors: {
                $sum: { $cond: ['$flags.isSuspicious', 1, 0] }
              },
              avgCredibility: { $avg: '$credibilityScore.overall' },
              avgInfluence: { $avg: '$networkMetrics.influenceScore' }
            }
          }
        ],
        
        // By type distribution
        byType: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              avgCredibility: { $avg: '$credibilityScore.overall' },
              avgFollowers: { $avg: '$profile.followers' }
            }
          }
        ],
        
        // Recent activity (authors who posted recently)
        recentActivity: [
          {
            $match: {
              'statistics.lastPostDate': { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              activeAuthors: { $sum: 1 },
              avgPostsPerAuthor: { $avg: '$statistics.totalPosts' }
            }
          }
        ]
      }
    }
  ]);
};

// ========================================
// MIDDLEWARE HOOKS
// ========================================

// Pre-save middleware
AuthorSchema.pre('save', function(next) {
  // Update influence score if profile data changed
  if (this.isModified('profile.followers') || this.isModified('statistics.averageEngagement')) {
    this.calculateInfluenceScore();
  }
  
  // Update credibility score if factors changed
  if (this.isModified('credibilityScore.factors')) {
    this.updateCredibilityScore();
  }
  
  next();
});

// Post-save middleware
AuthorSchema.post('save', async function(doc) {
  // Log significant credibility changes
  if (this.isModified('credibilityScore.overall')) {
    const SystemLog = model('SystemLog');
    await SystemLog.create({
      level: 'INFO',
      service: 'author_analysis',
      action: 'credibility_update',
      message: `Credibility score updated for author ${doc.name}`,
      details: {
        authorId: doc.facebookId,
        newScore: doc.credibilityScore.overall,
        factors: doc.credibilityScore.factors
      }
    });
  }
});
 const Author = model('Author', AuthorSchema);
export default Author;