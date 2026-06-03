let studentAcademics = JSON.parse(localStorage.getItem('student_academics')) || {};

function showTab(event, tabId) {
    if (event) {
        event.preventDefault();
    }
    
    // Hide all contents
    const contents = document.querySelectorAll('.academics-content');
    contents.forEach(content => {
        content.style.display = 'none';
    });

    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    // Show selected content
    document.getElementById(`content-${tabId}`).style.display = 'flex';

    // Add active class to clicked menu item
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

function submitEnrollment(e) {
    e.preventDefault();
    const firstName = document.getElementById('enrollFirstName').value.trim();
    const lastName = document.getElementById('enrollLastName').value.trim();
    const fullName = firstName + " " + lastName;
    const mockAtt = parseInt(document.getElementById('enrollAttendanceMock').value) || 80;

    // 1. Give them an enrollment profile
    studentAcademics[fullName.toLowerCase()] = {
        attendance: mockAtt,
        semRegistered: false,
        enrolled: true
    };
    saveAcademics();

    // 2. Add them to Student Entry (university_students) automatically
    let lmsStudents = JSON.parse(localStorage.getItem('university_students')) || [];
    if(!lmsStudents.some(s => s.name.toLowerCase() === fullName.toLowerCase())) {
        lmsStudents.push({ name: fullName, age: 20, grade: "New Enrollment" });
        localStorage.setItem('university_students', JSON.stringify(lmsStudents));
    }

    alert(`Successfully Enrolled ${fullName}! Your starting attendance is recorded as ${mockAtt}%. Complete Semester Registration next to unlock Resource Booking.`);
    document.getElementById('content-enrollment').querySelector('form').reset();
}

function submitSemRegistration(e) {
    e.preventDefault();
    const name = document.getElementById('semRegName').value.trim();
    
    if(!studentAcademics[name.toLowerCase()] || !studentAcademics[name.toLowerCase()].enrolled) {
        alert("You must complete the Enrollment Form first!");
        return;
    }
    
    studentAcademics[name.toLowerCase()].semRegistered = true;
    saveAcademics();
    alert(`Semester Registration complete for ${name}. You are now eligible to book resources (if attendance >= 50%)!`);
    document.getElementById('content-sem-reg').querySelector('form').reset();
}

function submitABC(e) {
    e.preventDefault();
    alert("ABC Account Linked Successfully!");
    document.getElementById('content-abc-acc').querySelector('form').reset();
}

function checkAttendance(e) {
    e.preventDefault();
    const name = document.getElementById('attName').value.trim().toLowerCase();
    const display = document.getElementById('attendanceDisplay');
    
    if(!studentAcademics[name]) {
        alert("Student not found in Academics registry. Please Enroll first.");
        display.style.display = 'none';
        return;
    }

    const att = studentAcademics[name].attendance;
    document.getElementById('attResultLabel').innerText = `Results for ${name.toUpperCase()}`;
    document.getElementById('valAttended').innerText = att;
    const span = document.getElementById('valPercent');
    span.innerText = att + '%';
    
    if(att >= 50) {
        span.style.color = '#10b981'; // Green
    } else {
        span.style.color = '#ef4444'; // Red
    }
    
    display.style.display = 'block';
}

function saveAcademics() {
    localStorage.setItem('student_academics', JSON.stringify(studentAcademics));
}
