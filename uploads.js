const express = require('express');
const { uploadConfigs, handleUploadError } = require('../middleware/upload');
const auth = require('../middleware/auth');
const router = express.Router();

// Upload profile picture
router.post('/profile-picture', 
  auth,
  uploadConfigs.profilePicture.single('profilePicture'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const fileUrl = `/uploads/profiles/${req.file.filename}`;
      
      // Update user profile picture in database
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user.id, {
        profilePicture: fileUrl
      });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: fileUrl,
          fileSize: req.file.size
        }
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during file upload'
      });
    }
  }
);

// Upload course thumbnail
router.post('/course-thumbnail',
  auth,
  uploadConfigs.courseThumbnail.single('thumbnail'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const fileUrl = `/uploads/courses/thumbnails/${req.file.filename}`;

      res.json({
        success: true,
        message: 'Course thumbnail uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: fileUrl,
          fileSize: req.file.size
        }
      });
    } catch (error) {
      console.error('Course thumbnail upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during file upload'
      });
    }
  }
);

// Upload course video
router.post('/course-video',
  auth,
  uploadConfigs.courseVideo.single('video'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const fileUrl = `/uploads/courses/videos/${req.file.filename}`;

      res.json({
        success: true,
        message: 'Course video uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: fileUrl,
          fileSize: req.file.size,
          duration: req.body.duration || null
        }
      });
    } catch (error) {
      console.error('Course video upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during file upload'
      });
    }
  }
);

// Upload lesson resources (multiple files)
router.post('/lesson-resources',
  auth,
  uploadConfigs.lessonResource.array('resources', 5), // Max 5 files
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        fileUrl: `/uploads/lessons/resources/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype
      }));

      res.json({
        success: true,
        message: `${req.files.length} file(s) uploaded successfully`,
        data: uploadedFiles
      });
    } catch (error) {
      console.error('Lesson resources upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during file upload'
      });
    }
  }
);

// Upload assignment submission
router.post('/assignment-submission',
  auth,
  uploadConfigs.assignmentSubmission.single('submission'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const fileUrl = `/uploads/assignments/${req.file.filename}`;

      // Here you would typically save the submission to database
      // const AssignmentSubmission = require('../models/AssignmentSubmission');
      // await AssignmentSubmission.create({...});

      res.json({
        success: true,
        message: 'Assignment submitted successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: fileUrl,
          fileSize: req.file.size,
          submittedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Assignment submission upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during file upload'
      });
    }
  }
);

// Get file info
router.get('/file-info/:type/:filename', auth, (req, res) => {
  try {
    const { type, filename } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, '..', 'uploads', type, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      data: {
        filename: filename,
        fileSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      }
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;