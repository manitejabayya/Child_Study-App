// models/Category.js
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  icon: {
    type: String,
    required: [true, 'Please add an icon'],
    default: '📚'
  },
  color: {
    type: String,
    required: [true, 'Please add a color'],
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please add a valid hex color']
  },
  order: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lessonCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Update lesson count when lessons are added/removed
CategorySchema.methods.updateLessonCount = async function() {
  const Lesson = mongoose.model('Lesson');
  this.lessonCount = await Lesson.countDocuments({ 
    category: this.name.toLowerCase(),
    isActive: true 
  });
  return this.save();
};

module.exports = mongoose.model('Category', CategorySchema);