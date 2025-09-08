// models/Analysis.js
// MongoDB Analysis Model for Social Media Monitoring System

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// ========================================
// ANALYSIS MODEL
// ========================================
const AnalysisSchema = new Schema({
  // Link to post
  postId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    ref: 'Post'
  },

  // AI Analysis Results
  hateSpeech: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    classification: {
      type: String,
      enum: ['none', 'mild', 'moderate', 'severe'],
      required: true
    },
    categories: [{
      type: String,
      enum: [
        'racial', 'religious', 'gender', 'sexual_orientation', 
        'disability', 'nationality', 'political', 'other'
      ]
    }],
    keywords: [String],
    explanation: String
  },

  disinformation: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    classification: {
      type: String,
      enum: ['verified', 'unverified', 'misleading', 'false'],
      required: true
    },
    categories: [{
      type: String,
      enum: [
        'medical', 'political', 'climate', 'conspiracy',
        'financial', 'technology', 'social', 'other'
      ]
    }],
    factCheckResults: [{
      source: String,
      url: String,
      verdict: {
        type: String,
        enum: ['true', 'mostly_true', 'mixed', 'mostly_false', 'false', 'unverified']
      },
      confidence: Number
    }],
    evidenceUrls: [String],
    explanation: String
  },

  sentiment: {
    overall: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      required: true
    },
    scores: {
      positive: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      },
      neutral: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      },
      negative: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      }
    },
    emotions: {
      anger: { type: Number, min: 0, max: 1, default: 0 },
      fear: { type: Number, min: 0, max: 1, default: 0 },
      joy: { type: Number, min: 0, max: 1, default: 0 },
      sadness: { type: Number, min: 0, max: 1, default: 0 },
      surprise: { type: Number, min: 0, max: 1, default: 0 },
      disgust: { type: Number, min: 0, max: 1, default: 0 }
    }
  },

  // Content analysis
  contentAnalysis: {
    language: String,
    readabilityScore: Number,
    wordCount: Number,
    keyPhrases: [String],
    namedEntities: [{
      text: String,
      type: {
        type: String,
        enum: ['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'OTHER']
      },
      confidence: Number
    }],
    topics: [{
      name: String,
      relevance: Number
    }]
  },

  // Media analysis (if applicable)
  mediaAnalysis: [{
    mediaType: {
      type: String,
      enum: ['image', 'video', 'link']
    },
    mediaUrl: String,
    analysis: {
      explicitContent: {
        score: Number,
        classification: {
          type: String,
          enum: ['safe', 'moderate', 'adult']
        }
      },
      violence: {
        score: Number,
        detected: Boolean
      },
      textInImage: String,
      faces: [{
        confidence: Number,
        emotions: Schema.Types.Mixed,
        demographics: {
          ageRange: String,
          gender: String
        }
      }],
      objects: [{
        name: String,
        confidence: Number
      }]
    }
  }],

  // Overall assessment
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },

  // Processing information
  processingInfo: {
    analyzedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    processingTime: Number, // milliseconds
    modelVersions: {
      hateSpeech: String,
      disinformation: String,
      sentiment: String,
      contentAnalysis: String
    },
    apiResponses: {
      hateSpeech: Schema.Types.Mixed,
      disinformation: Schema.Types.Mixed,
      sentiment: Schema.Types.Mixed
    },
    errors: [String],
    warnings: [String]
  },

  // Human review
  humanReview: {
    required: {
      type: Boolean,
      default: false
    },
    completed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    verdict: {
      type: String,
      enum: ['confirmed', 'disputed', 'corrected', 'false_positive']
    },
    corrections: {
      hateSpeech: {
        score: Number,
        classification: String,
        explanation: String
      },
      disinformation: {
        score: Number,
        classification: String,
        explanation: String
      },
      overallScore: Number,
      riskLevel: String
    },
    notes: String,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true,
  collection: 'analyses'
});

// Indexes
AnalysisSchema.index({ 'riskLevel': 1, 'processingInfo.analyzedAt': -1 });
AnalysisSchema.index({ 'overallScore': -1 });
AnalysisSchema.index({ 'hateSpeech.classification': 1, 'disinformation.classification': 1 });
AnalysisSchema.index({ 'humanReview.required': 1, 'humanReview.completed': 1 });

// Compound indexes for performance
AnalysisSchema.index({
  'riskLevel': 1,
  'processingInfo.analyzedAt': -1,
  'overallScore': -1
});

AnalysisSchema.index({
  'hateSpeech.classification': 1,
  'disinformation.classification': 1,
  'processingInfo.analyzedAt': -1
});

// ========================================
// METHODS
// ========================================

// Instance methods
AnalysisSchema.methods.updateOverallScore = function() {
  const weights = {
    hateSpeech: 0.4,
    disinformation: 0.4,
    sentiment: 0.2
  };
  
  const hateSpeechScore = this.hateSpeech.score * 100;
  const disinformationScore = this.disinformation.score * 100;
  const sentimentScore = this.sentiment.scores.negative * 100;
  
  this.overallScore = Math.round(
    (hateSpeechScore * weights.hateSpeech) +
    (disinformationScore * weights.disinformation) +
    (sentimentScore * weights.sentiment)
  );
  
  // Update risk level based on overall score
  if (this.overallScore >= 70) {
    this.riskLevel = 'RED';
  } else if (this.overallScore >= 40) {
    this.riskLevel = 'YELLOW';
  } else {
    this.riskLevel = 'GREEN';
  }
  
  return this.overallScore;
};

// Static methods
AnalysisSchema.statics.getDashboardMetrics = function(timeRange = 7) {
  const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        'processingInfo.analyzedAt': { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        avgProcessingTime: { $avg: '$processingInfo.processingTime' },
        riskDistribution: {
          $push: '$riskLevel'
        },
        avgHateSpeechScore: { $avg: '$hateSpeech.score' },
        avgDisinformationScore: { $avg: '$disinformation.score' },
        avgOverallScore: { $avg: '$overallScore' }
      }
    },
    {
      $project: {
        totalAnalyses: 1,
        avgProcessingTime: { $round: ['$avgProcessingTime', 0] },
        avgHateSpeechScore: { $round: ['$avgHateSpeechScore', 3] },
        avgDisinformationScore: { $round: ['$avgDisinformationScore', 3] },
        avgOverallScore: { $round: ['$avgOverallScore', 1] },
        riskDistribution: {
          RED: {
            $size: {
              $filter: {
                input: '$riskDistribution',
                cond: { $eq: ['$this', 'RED'] }
              }
            }
          },
          YELLOW: {
            $size: {
              $filter: {
                input: '$riskDistribution',
                cond: { $eq: ['$this', 'YELLOW'] }
              }
            }
          },
          GREEN: {
            $size: {
              $filter: {
                input: '$riskDistribution',
                cond: { $eq: ['$this', 'GREEN'] }
              }
            }
          }
        }
      }
    }
  ]);
};

AnalysisSchema.statics.getTimeSeriesData = function(timeRange = 30, interval = 'daily') {
  const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
  
  let groupBy;
  switch (interval) {
    case 'hourly':
      groupBy = {
        year: { $year: '$processingInfo.analyzedAt' },
        month: { $month: '$processingInfo.analyzedAt' },
        day: { $dayOfMonth: '$processingInfo.analyzedAt' },
        hour: { $hour: '$processingInfo.analyzedAt' }
      };
      break;
    case 'weekly':
      groupBy = {
        year: { $year: '$processingInfo.analyzedAt' },
        week: { $week: '$processingInfo.analyzedAt' }
      };
      break;
    default: // daily
      groupBy = {
        year: { $year: '$processingInfo.analyzedAt' },
        month: { $month: '$processingInfo.analyzedAt' },
        day: { $dayOfMonth: '$processingInfo.analyzedAt' }
      };
  }
  
  return this.aggregate([
    {
      $match: {
        'processingInfo.analyzedAt': { $gte: startDate }
      }
    },
    {
      $group: {
        _id: groupBy,
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$overallScore' },
        riskLevels: { $push: '$riskLevel' },
        date: { $first: '$processingInfo.analyzedAt' }
      }
    },
    {
      $project: {
        date: '$date',
        count: 1,
        avgRiskScore: { $round: ['$avgRiskScore', 1] },
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
      $sort: { date: 1 }
    }
  ]);
};

// ========================================
// MIDDLEWARE HOOKS
// ========================================

// Pre-save middleware
AnalysisSchema.pre('save', function(next) {
  // Update overall score before saving
  this.updateOverallScore();
  next();
});

// Post-save middleware
AnalysisSchema.post('save', async function(doc) {
  // Update author statistics when analysis is completed
  if (this.isNew) {
    const Author = model('Author');
    const Post = model('Post');
    
    const post = await Post.findOne({ postId: doc.postId });
    if (post) {
      const updateData = {};
      
      if (doc.riskLevel === 'RED') {
        if (doc.hateSpeech.score > 0.7) {
          updateData['$inc'] = { 'statistics.hateSpeechPosts': 1 };
        }
        if (doc.disinformation.score > 0.7) {
          updateData['$inc'] = { 
            ...updateData['$inc'],
            'statistics.disinformationPosts': 1 
          };
        }
      }
      
      // Add to risk history
      updateData['$push'] = {
        'statistics.riskHistory': {
          $each: [{
            date: new Date(),
            riskLevel: doc.riskLevel,
            reason: doc.riskLevel === 'RED' ? 'High risk content detected' : 'Content analyzed',
            postId: doc.postId
          }],
          $slice: -50 // Keep only last 50 entries
        }
      };
      
      if (Object.keys(updateData).length > 0) {
        await Author.findOneAndUpdate(
          { facebookId: post.metadata.authorId },
          updateData
        );
      }
    }
  }
});

const Analysis = model('Analysis', AnalysisSchema);
export default Analysis;