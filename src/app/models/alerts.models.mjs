// MongoDB Models for Social Media Monitoring System
// Using Mongoose ODM for Node.js

import mongoose from 'mongoose';
const { Schema, model } = mongoose;


// ========================================
// 5. ALERTS MODEL
// ========================================
const AlertSchema = new Schema({
  // Alert identification
  alertId: {
    type: String,
    unique: true,
    default: () => `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Related content
  postId: {
    type: String,
    required: true,
    index: true
  },
  topicId: {
    type: Schema.Types.ObjectId,
    ref: 'Topic',
    index: true
  },
  authorId: String,

  // Alert details
  type: {
    type: String,
    enum: ['hate_speech', 'disinformation', 'viral_danger', 'system_anomaly', 'manual_review'],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Trigger conditions
  triggerConditions: {
    riskLevel: String,
    riskScore: Number,
    viralityScore: Number,
    engagementRate: Number,
    spreadRate: Number, // posts per hour
    thresholdExceeded: String,
    timeWindow: Number // hours
  },

  // Notification tracking
  recipients: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'webhook', 'push'],
      required: true
    },
    address: {
      type: String,
      required: true
    },
    userId: Schema.Types.ObjectId,
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced']
    },
    errorMessage: String
  }],

  // Alert lifecycle
  status: {
    type: String,
    enum: ['pending', 'sent', 'acknowledged', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  
  // Response tracking
  acknowledgedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date,
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolutionNotes: String,
  resolutionCategory: {
    type: String,
    enum: ['false_positive', 'confirmed_threat', 'mitigated', 'escalated', 'no_action_needed']
  },

  // Escalation
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  escalatedTo: [{
    userId: Schema.Types.ObjectId,
    escalatedAt: Date,
    reason: String
  }],

  // Metadata
  metadata: {
    source: {
      type: String,
      default: 'automated_system'
    },
    confidence: Number,
    relatedAlerts: [String],
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'alerts'
});

// Indexes
AlertSchema.index({ 'status': 1, 'createdAt': -1 });
AlertSchema.index({ 'severity': 1, 'type': 1 });
AlertSchema.index({ 'postId': 1, 'type': 1 });

// ========================================
// 6. USERS MODEL (System Users)
// ========================================
const UserSchema = new Schema({
  // Authentication
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  passwordHash: {
    type: String,
    required: true
  },

  // Profile
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phone: String,
    organization: String,
    position: String,
    avatar: String
  },

  // System role
  role: {
    type: String,
    enum: ['admin', 'analyst', 'viewer', 'moderator'],
    default: 'viewer',
    index: true
  },
  permissions: [{
    type: String,
    enum: [
      'read_posts', 'create_topics', 'edit_topics', 'delete_topics',
      'manage_alerts', 'export_data', 'manage_users', 'system_config',
      'moderate_content', 'view_analytics', 'generate_reports'
    ]
  }],

  // Notification preferences
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['immediate', 'hourly', 'daily', 'weekly'],
        default: 'immediate'
      },
      types: [{
        type: String,
        enum: ['alerts', 'reports', 'system', 'digest']
      }]
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      number: String,
      urgentOnly: {
        type: Boolean,
        default: true
      }
    }
  },

  // Activity tracking
  activity: {
    lastLogin: Date,
    loginCount: {
      type: Number,
      default: 0
    },
    lastActivity: Date,
    topicsManaged: [{
      type: Schema.Types.ObjectId,
      ref: 'Topic'
    }],
    alertsHandled: {
      type: Number,
      default: 0
    }
  },

  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
UserSchema.index({ 'email': 1, 'status': 1 });
UserSchema.index({ 'role': 1, 'status': 1 });

// ========================================
// 7. ANALYTICS CACHE MODEL
// ========================================
const AnalyticsCacheSchema = new Schema({
  // Cache identification
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cacheType: {
    type: String,
    enum: ['dashboard', 'report', 'trend', 'geographic', 'author_stats'],
    required: true
  },
  
  // Time period
  period: {
    type: String,
    enum: ['realtime', 'hourly', 'daily', 'weekly', 'monthly', 'custom'],
    required: true
  },
  dateRange: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },

  // Cached data
  data: {
    // Dashboard metrics
    totalPosts: Number,
    totalAuthors: Number,
    hateSpeechCount: Number,
    disinformationCount: Number,
    
    // Risk distribution
    riskDistribution: {
      GREEN: { type: Number, default: 0 },
      YELLOW: { type: Number, default: 0 },
      RED: { type: Number, default: 0 }
    },

    // Trends
    trends: [{
      date: Date,
      totalPosts: Number,
      riskScore: Number,
      engagement: Number
    }],

    // Top entities
    topAuthors: [{
      authorId: String,
      name: String,
      posts: Number,
      riskLevel: String,
      credibilityScore: Number
    }],
    topTopics: [{
      topicId: String,
      name: String,
      mentions: Number,
      riskLevel: String
    }],

    // Geographic data
    geographicDistribution: [{
      region: String,
      count: Number,
      riskLevel: String,
      coordinates: [Number] // [lng, lat]
    }],

    // Engagement patterns
    engagementMetrics: {
      averageLikes: Number,
      averageShares: Number,
      averageComments: Number,
      viralThreshold: Number
    },

    // Custom metrics
    customMetrics: Schema.Types.Mixed
  },

  // Cache metadata
  generationTime: {
    type: Number, // milliseconds
    required: true
  },
  recordCount: Number,
  dataSize: Number, // bytes
  
  // TTL (Time To Live)
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  
  // Cache status
  status: {
    type: String,
    enum: ['valid', 'stale', 'regenerating'],
    default: 'valid'
  },
  hitCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'analytics_cache'
});

// Indexes
AnalyticsCacheSchema.index({ 'cacheType': 1, 'period': 1 });
AnalyticsCacheSchema.index({ 'expiresAt': 1 }); // TTL index

// ========================================
// 8. SYSTEM LOGS MODEL
// ========================================
const SystemLogSchema = new Schema({
  // Log identification
  logId: {
    type: String,
    default: () => `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Log details
  level: {
    type: String,
    enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
    required: true,
    index: true
  },
  service: {
    type: String,
    enum: [
      'facebook_collector', 'ai_analyzer', 'alert_system', 'api_server',
      'dashboard', 'report_generator', 'user_auth', 'database', 'cache'
    ],
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  
  // Log content
  message: {
    type: String,
    required: true
  },
  details: {
    postId: String,
    userId: String,
    sessionId: String,
    requestId: String,
    processingTime: Number,
    errorCode: String,
    errorMessage: String,
    stackTrace: String,
    apiResponse: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed
  },

  // Correlation
  correlationId: String,
  parentLogId: String,
  traceId: String,

  // Performance metrics
  performance: {
    duration: Number, // milliseconds
    memoryUsage: Number, // bytes
    cpuUsage: Number, // percentage
    networkLatency: Number // milliseconds
  },

  // Context
  context: {
    userAgent: String,
    ipAddress: String,
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'production'
    },
    version: String
  }
}, {
  timestamps: false, // We use custom timestamp
  collection: 'system_logs'
});

// Indexes with TTL for log rotation
SystemLogSchema.index({ 'timestamp': 1 }, { expireAfterSeconds: 7776000 }); // 90 days
SystemLogSchema.index({ 'level': 1, 'timestamp': -1 });
SystemLogSchema.index({ 'service': 1, 'action': 1, 'timestamp': -1 });
SystemLogSchema.index({ 'correlationId': 1 });

// ========================================
// MODEL EXPORTS
// ========================================
export const Post = model('Post', PostSchema);
export const Analysis = model('Analysis', AnalysisSchema);
export const Topic = model('Topic', TopicSchema);
export const Author = model('Author', AuthorSchema);
export const Alert = model('Alert', AlertSchema);
export const User = model('User', UserSchema);
export const AnalyticsCache = model('AnalyticsCache', AnalyticsCacheSchema);
export const SystemLog = model('SystemLog', SystemLogSchema);

// ========================================
// UTILITY FUNCTIONS FOR MODELS
// ========================================




// Topic model methods
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

// User model methods
UserSchema.methods.canPerform = function(action) {
  const rolePermissions = {
    admin: [
      'read_posts', 'create_topics', 'edit_topics', 'delete_topics',
      'manage_alerts', 'export_data', 'manage_users', 'system_config',
      'moderate_content', 'view_analytics', 'generate_reports'
    ],
    analyst: [
      'read_posts', 'create_topics', 'edit_topics', 'manage_alerts',
      'export_data', 'moderate_content', 'view_analytics', 'generate_reports'
    ],
    moderator: [
      'read_posts', 'manage_alerts', 'moderate_content', 'view_analytics'
    ],
    viewer: [
      'read_posts', 'view_analytics'
    ]
  };
  
  const allowedPermissions = rolePermissions[this.role] || [];
  return allowedPermissions.includes(action) || this.permissions.includes(action);
};

UserSchema.methods.updateLastActivity = function() {
  this.activity.lastActivity = new Date();
  return this.save();
};

// ========================================
// STATIC METHODS AND QUERIES
// ========================================





// Alert static methods
AlertSchema.statics.getActiveAlerts = function(severity = null) {
  const matchCondition = {
    status: { $in: ['pending', 'sent', 'acknowledged'] }
  };
  
  if (severity) {
    matchCondition.severity = severity;
  }
  
  return this.find(matchCondition)
    .populate('topicId', 'name category')
    .sort({ 
      severity: 1, // CRITICAL first (alphabetically)
      createdAt: -1 
    });
};

AlertSchema.statics.getAlertStatistics = function(timeRange = 7) {
  const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        byType: {
          $push: '$type'
        },
        bySeverity: {
          $push: '$severity'
        },
        byStatus: {
          $push: '$status'
        },
        avgResponseTime: {
          $avg: {
            $subtract: [
              { $ifNull: ['$acknowledgedAt', new Date()] },
              '$createdAt'
            ]
          }
        }
      }
    },
    {
      $project: {
        totalAlerts: 1,
        avgResponseTime: { 
          $round: [{ 
            $divide: ['$avgResponseTime', 1000 * 60] // Convert to minutes
          }, 1] 
        },
        typeDistribution: {
          hate_speech: {
            $size: {
              $filter: {
                input: '$byType',
                cond: { $eq: ['$this', 'hate_speech'] }
              }
            }
          },
          disinformation: {
            $size: {
              $filter: {
                input: '$byType',
                cond: { $eq: ['$this', 'disinformation'] }
              }
            }
          },
          viral_danger: {
            $size: {
              $filter: {
                input: '$byType',
                cond: { $eq: ['$this', 'viral_danger'] }
              }
            }
          }
        },
        severityDistribution: {
          CRITICAL: {
            $size: {
              $filter: {
                input: '$bySeverity',
                cond: { $eq: ['$this', 'CRITICAL'] }
              }
            }
          },
          HIGH: {
            $size: {
              $filter: {
                input: '$bySeverity',
                cond: { $eq: ['$this', 'HIGH'] }
              }
            }
          },
          MEDIUM: {
            $size: {
              $filter: {
                input: '$bySeverity',
                cond: { $eq: ['$this', 'MEDIUM'] }
              }
            }
          },
          LOW: {
            $size: {
              $filter: {
                input: '$bySeverity',
                cond: { $eq: ['$this', 'LOW'] }
              }
            }
          }
        }
      }
    }
  ]);
};

// ========================================
// PRE/POST MIDDLEWARE HOOKS
// ========================================




// Alert middleware
AlertSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set initial priority based on severity
    const priorityMap = {
      'CRITICAL': 10,
      'HIGH': 8,
      'MEDIUM': 5,
      'LOW': 2
    };
    this.priority = priorityMap[this.severity] || 5;
  }
  next();
});

// User middleware
UserSchema.pre('save', function(next) {
  // Update login count if last login is being set
  if (this.isModified('activity.lastLogin')) {
    this.activity.loginCount += 1;
  }
  next();
});

// System Log middleware
SystemLogSchema.pre('save', function(next) {
  // Generate correlation ID if not provided
  if (!this.correlationId) {
    this.correlationId = `${this.service}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// ========================================
// COMPOUND INDEXES FOR PERFORMANCE
// ========================================






AlertSchema.index({
  'severity': 1,
  'type': 1,
  'status': 1,
  'createdAt': -1
});

UserSchema.index({
  'role': 1,
  'status': 1,
  'activity.lastLogin': -1
});

// Text search indexes
PostSchema.index({
  'content.text': 'text',
  'metadata.authorName': 'text'
});

TopicSchema.index({
  
  'name': 'text',
  'keywords.text': 'text'
});

