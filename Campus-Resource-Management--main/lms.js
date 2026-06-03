let students = JSON.parse(localStorage.getItem('university_students')) || [];

function removeExpiredResourceBookings() {
    const now = new Date();
    const all = JSON.parse(localStorage.getItem('resource_bookings')) || [];
    const active = all.filter(b =>
        b.status === 'Approved' && b.end && new Date(b.end) > now
    );
    if (active.length !== all.length) {
        localStorage.setItem('resource_bookings', JSON.stringify(active));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    removeExpiredResourceBookings();
    renderStudents();
    renderBookingTracker();
});

function addStudent() {
  const name = document.getElementById('name').value.trim();
  const age = document.getElementById('age').value.trim();
  const grade = document.getElementById('grade').value.trim();

  if (name === "" || age === "" || grade === "") {
    alert("Please fill in all fields.");
    return;
  }

  const student = { name, age, grade };
  students.push(student);
  saveData();
  renderStudents();
  clearForm();
}

function deleteStudent(index) {
  students.splice(index, 1);
  saveData();
  renderStudents();
}

function saveData() {
    localStorage.setItem('university_students', JSON.stringify(students));
}

function renderStudents() {
  const studentTableBody = document.getElementById('studentTableBody');
  studentTableBody.innerHTML = '';

  students.forEach((student, index) => {
    const row = `<tr style="border-bottom:1px solid #ddd;">
      <td style="padding:10px;">${student.name}</td>
      <td style="padding:10px;">${student.age}</td>
      <td style="padding:10px;">${student.grade}</td>
      <td style="padding:10px;"><button style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;" onclick="deleteStudent(${index})">Remove</button></td>
    </tr>`;
    studentTableBody.innerHTML += row;
  });
}

function clearForm() {
  document.getElementById('name').value = '';
  document.getElementById('age').value = '';
  document.getElementById('grade').value = '';
}

function renderBookingTracker() {
    removeExpiredResourceBookings();
    let bookings = JSON.parse(localStorage.getItem('resource_bookings')) || [];
    let studentBookings = bookings.filter(b => b.role === 'student');

    let approved = 0;
    let denied = 0;

    const tbody = document.getElementById('studentBookingTracker');
    tbody.innerHTML = '';

    studentBookings.forEach(b => {
        if(b.status === 'Approved') approved++;
        else denied++;

        let statusColor = b.status === 'Approved' ? '#10b981' : '#ef4444';
        
        let timeLabel = b.time || '—';
        if (b.start && b.end) {
            const s = new Date(b.start);
            const e = new Date(b.end);
            const opts = { hour: 'numeric', minute: '2-digit', hour12: true };
            timeLabel = `${s.toLocaleDateString()} ${s.toLocaleTimeString([], opts)} – ${e.toLocaleTimeString([], opts)}`;
        }

        const row = `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px; font-weight:600;">${b.name}</td>
            <td style="padding:10px;">${b.resource}</td>
            <td style="padding:10px; color:#666;">${timeLabel}</td>
            <td style="padding:10px; color:${statusColor}; font-weight:bold;">${b.status}</td>
        </tr>`;
        tbody.innerHTML += row;
    });

    document.getElementById('stTotal').innerText = studentBookings.length;
    document.getElementById('stApproved').innerText = approved;
    document.getElementById('stDenied').innerText = denied;
}
