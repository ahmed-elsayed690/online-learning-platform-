const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Load data
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));

// Create an Express app
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());
app.use(cors());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Middleware to make data available to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.platformStats = data.platform_stats;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.render('home', {
        courses: data.courses.slice(0, 6),
        categories: data.categories
    });
});

app.get('/home', (req, res) => {
    res.redirect('/');
});

app.get('/about', (req, res) => {
    res.render('about', {
        reviews: data.reviews
    });
});

app.get('/courses', (req, res) => {
    res.render('courses', {
        courses: data.courses
    });
});

app.get('/teachers', (req, res) => {
    res.render('teachers', {
        teachers: data.teachers
    });
});

app.get('/teacher_profile/:id', (req, res) => {
    const teacher = data.teachers.find(t => t.id === parseInt(req.params.id));
    if (!teacher) return res.status(404).render('404');
    
    const teacherCourses = data.courses.filter(c => c.instructor === teacher.name);
    res.render('teacher_profile', {
        teacher,
        courses: teacherCourses
    });
});

app.get('/playlist/:id', (req, res) => {
    const course = data.courses.find(c => c.id === parseInt(req.params.id));
    if (!course) return res.status(404).render('404');
    
    res.render('playlist', {
        course,
        tutor: data.users.find(u => u.name === course.instructor)
    });
});

app.get('/watch-video/:courseId/:videoIndex', (req, res) => {
    const course = data.courses.find(c => c.id === parseInt(req.params.courseId));
    if (!course) return res.status(404).render('404');
    
    const video = course.videos[req.params.videoIndex];
    if (!video) return res.status(404).render('404');
    
    res.render('watchvideo', {
        video,
        course,
        tutor: data.users.find(u => u.name === course.instructor),
        comments: data.reviews.slice(0, 6) // Mock comments
    });
});

app.get('/profile', (req, res) => {
    if (!res.locals.user) return res.redirect('/login');
    
    const user = data.users.find(u => u.id === res.locals.user.id);
    if (!user) return res.status(404).render('404');
    
    res.render('profile', {
        user
    });
});

app.get('/update', (req, res) => {
    if (!res.locals.user) return res.redirect('/login');
    res.render('update');
});

app.get('/login', (req, res) => {
    if (res.locals.user) return res.redirect('/profile');
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = data.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        return res.redirect('/profile');
    }
    
    res.render('login', { error: 'Invalid email or password' });
});

app.get('/register', (req, res) => {
    if (res.locals.user) return res.redirect('/profile');
    res.render('register');
});

app.post('/register', (req, res) => {
    // In a real app, you would hash the password and save to database
    const { name, email, password, confirm_password } = req.body;
    
    if (password !== confirm_password) {
        return res.render('register', { error: 'Passwords do not match' });
    }
    
    if (data.users.some(u => u.email === email)) {
        return res.render('register', { error: 'Email already exists' });
    }
    
    // Mock user creation
    const newUser = {
        id: data.users.length + 1,
        name,
        email,
        password,
        role: 'student',
        image: 'images/pic-1.jpg',
        joined: new Date().toISOString().split('T')[0],
        saved_playlists: 0,
        liked_tutorials: 0,
        comments: 0
    };
    
    // In a real app, you would save to database here
    req.session.user = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
    };
    
    res.redirect('/profile');
});

app.post('/update-profile', (req, res) => {
    if (!res.locals.user) return res.redirect('/login');
    
    // In a real app, you would update the user in database
    res.redirect('/profile');
});

app.get('/contact', (req, res) => {
    res.render('contact', {
        contactInfo: data.contact_info
    });
});

app.post('/contact', (req, res) => {
    // In a real app, you would process the contact form
    res.render('contact', {
        success: 'Your message has been sent successfully!',
        contactInfo: data.contact_info
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Page Not Found'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
