document.addEventListener('DOMContentLoaded', () => {
    const facultyForm = document.getElementById('facultyForm');
    const updateBtn = document.getElementById('updateBtn');
    let editIndex = -1;

    // Load from specific LocalStorage key
    let faculties = JSON.parse(localStorage.getItem('university_faculty')) || [];

    // Initial render
    renderTable();
    renderBookingTracker();

    facultyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const faculty = {
            id: document.getElementById('id').value.trim(),
            name: document.getElementById('name').value.trim(),
            department: document.getElementById('department').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim()
        };

        if (editIndex === -1) {
            faculties.push(faculty);
        } else {
            console.error("Update not fully bound in this mock, use Add");
        }

        saveData();
        renderTable();
        facultyForm.reset();
    });

    function makeGlobal() {
        window.editFaculty = function(index) {
            const faculty = faculties[index];
            document.getElementById('id').value = faculty.id;
            document.getElementById('name').value = faculty.name;
            document.getElementById('department').value = faculty.department;
            document.getElementById('email').value = faculty.email;
            document.getElementById('phone').value = faculty.phone;
            
            editIndex = index;
            document.querySelector('#facultyForm button[type="submit"]').style.display = 'none';
            updateBtn.style.display = 'block';
        };

        window.deleteFaculty = function(index) {
            if(confirm("Delete this registry?")) {
                faculties.splice(index, 1);
                saveData();
                renderTable();
            }
        };

        updateBtn.addEventListener('click', () => {
            faculties[editIndex] = {
                id: document.getElementById('id').value,
                name: document.getElementById('name').value,
                department: document.getElementById('department').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value
            };
            saveData();
            renderTable();
            facultyForm.reset();
            editIndex = -1;
            document.querySelector('#facultyForm button[type="submit"]').style.display = 'block';
            updateBtn.style.display = 'none';
        });
    }

    function saveData() {
        localStorage.setItem('university_faculty', JSON.stringify(faculties));
    }

    function renderTable() {
        const tbody = document.querySelector('#facultyTable tbody');
        tbody.innerHTML = '';
        faculties.forEach((f, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${f.id}</td>
                <td style="font-weight:600;">${f.name}</td>
                <td>${f.department}</td>
                <td>${f.email}</td>
                <td>${f.phone}</td>
                <td class="actions">
                    <button onclick="editFaculty(${index})">Edit</button>
                    <button onclick="deleteFaculty(${index})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

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

    function renderBookingTracker() {
        removeExpiredResourceBookings();
        let bookings = JSON.parse(localStorage.getItem('resource_bookings')) || [];
        let facBookings = bookings.filter(b => b.role === 'faculty');

        let approved = 0;
        let denied = 0;

        const tbody = document.getElementById('facultyBookingTracker');
        tbody.innerHTML = '';

        facBookings.forEach(b => {
            if(b.status === 'Approved') approved++;
            else denied++;

            let statusColor = b.status === 'Approved' ? '#10b981' : '#ef4444';
            
            const row = `<tr>
                <td style="font-weight:600;">${b.name}</td>
                <td>${b.resource}</td>
                <td style="color:var(--text-light);">${b.time}</td>
                <td style="color:${statusColor}; font-weight:bold;">${b.status}</td>
            </tr>`;
            tbody.innerHTML += row;
        });

        document.getElementById('facTotal').innerText = facBookings.length;
        document.getElementById('facApproved').innerText = approved;
        document.getElementById('facDenied').innerText = denied;
    }

    makeGlobal();
});
