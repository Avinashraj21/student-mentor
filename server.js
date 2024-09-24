const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mentor-student', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Define Mentor and Student Schemas
const mentorSchema = new mongoose.Schema({
    name: String,
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

const studentSchema = new mongoose.Schema({
    name: String,
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' }
});

const Mentor = mongoose.model('Mentor', mentorSchema);
const Student = mongoose.model('Student', studentSchema);

// API to Create Mentor
app.post('/mentors', async (req, res) => {
    const mentor = new Mentor(req.body);
    try {
        await mentor.save();
        res.status(201).send(mentor);
    } catch (error) {
        res.status(400).send(error);
    }
});

// API to Create Student
app.post('/students', async (req, res) => {
    const student = new Student(req.body);
    try {
        await student.save();
        res.status(201).send(student);
    } catch (error) {
        res.status(400).send(error);
    }
});

// API to Assign a Student to a Mentor
app.post('/assign-student', async (req, res) => {
    const { studentId, mentorId } = req.body;
    try {
        const student = await Student.findById(studentId);
        const mentor = await Mentor.findById(mentorId);

        if (student && mentor) {
            student.mentor = mentorId;
            mentor.students.push(studentId);
            await student.save();
            await mentor.save();
            res.send({ student, mentor });
        } else {
            res.status(404).send('Student or Mentor not found');
        }
    } catch (error) {
        res.status(400).send(error);
    }
});

// API to Assign or Change Mentor for a Particular Student
app.put('/assign-mentor/:studentId', async (req, res) => {
    const { mentorId } = req.body;
    try {
        const student = await Student.findById(req.params.studentId);
        const oldMentorId = student.mentor;

        if (student) {
            if (oldMentorId) {
                await Mentor.findByIdAndUpdate(oldMentorId, { $pull: { students: student._id } });
            }
            student.mentor = mentorId;
            await student.save();
            await Mentor.findByIdAndUpdate(mentorId, { $addToSet: { students: student._id } });
            res.send(student);
        } else {
            res.status(404).send('Student not found');
        }
    } catch (error) {
        res.status(400).send(error);
    }
});

// API to Show All Students for a Particular Mentor
app.get('/mentors/:mentorId/students', async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.mentorId).populate('students');
        if (mentor) {
            res.send(mentor.students);
        } else {
            res.status(404).send('Mentor not found');
        }
    } catch (error) {
        res.status(400).send(error);
    }
});

// API to Show the Previously Assigned Mentor for a Particular Student
app.get('/students/:studentId/mentor', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId).populate('mentor');
        if (student) {
            res.send(student.mentor);
        } else {
            res.status(404).send('Student not found');
        }
    } catch (error) {
        res.status(400).send(error);
    }
});

// New API to Fetch All Mentor IDs
app.get('/mentors/ids', async (req, res) => {
    try {
        const mentors = await Mentor.find().select('_id');
        const mentorIds = mentors.map(mentor => mentor._id);
        res.send(mentorIds);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
