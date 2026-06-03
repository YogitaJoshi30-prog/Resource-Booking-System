function toggleIdField(role) {
    const idLabel = document.getElementById("idLabel");
    const idInput = document.getElementById("userId");
    
    if(role === 'student') {
        idLabel.innerText = "Student ID";
        idInput.placeholder = "Enter your Student ID";
    } else {
        idLabel.innerText = "Faculty ID";
        idInput.placeholder = "Enter your Faculty ID";
    }
}

function submitFeedback(event) {
    event.preventDefault(); // Prevent page reload
    
    // Switch to success state
    document.getElementById("feedbackForm").style.display = "none";
    document.getElementById("successState").style.display = "block";

    // Show toast for admin delivery simulation
    const toast = document.getElementById("toast");
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

function resetForm() {
    document.getElementById("feedbackForm").reset();
    document.getElementById("successState").style.display = "none";
    document.getElementById("feedbackForm").style.display = "block";
    toggleIdField('student'); // Default back
}
