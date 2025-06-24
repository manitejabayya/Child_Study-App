// models/Lesson.js
const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a lesson title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    enum: ['basics', 'coding', 'logic', 'projects', 'games'],
    lowercase: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  level: {
    type: Number,
    required: [true, 'Please specify lesson level'],
    min: 1,
    max: 10
  },
  order: {
    type: Number,
    required: [true, 'Please specify lesson order']
  },
  videoUrl: {
    type: String,
    required: [true, 'Please add a YouTube video URL'],
    match: [
      /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
      'Please add a valid YouTube URL'
    ]
  },
  videoId: {
    type: String,
    required: [true, 'Video ID is required']
  },
  duration: {
    type: Number, // in seconds
    required: [true, 'Please specify video duration']
  },
  thumbnail: {
    type: String,
    default: function() {
      return `https://img.youtube.com/vi/${this.videoId}/maxresdefault.jpg`;
    }
  },
  tags: [{
    type: String,
    lowercase: true
  }],
  learningObjectives: [{
    type: String,
    required: true
  }],
  prerequisites: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Lesson'
  }],
  points: {
    type: Number,
    default: 10,
    min: 5,
    max: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
LessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Extract video ID from YouTube URL
LessonSchema.pre('save', function(next) {
  if (this.videoUrl && !this.videoId) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = this.videoUrl.match(regExp);
    
    if (match && match[2].length === 11) {
      this.videoId = match[2];
    } else {
      return next(new Error('Invalid YouTube URL'));
    }
  }
  next();
});

// Increment view count
LessonSchema.methods.incrementViews = function() {
  return this.updateOne({ $inc: { viewCount: 1 } });
};

module.exports = mongoose.model('Lesson', LessonSchema);