async function registerUser() {

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;


    try {

        const response = await fetch(
            "http://localhost:5000/api/auth/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role: "student"
                })
            }
        );


        const data = await response.json();

        alert(data.message || "Registered successfully");


    } catch (error) {

        console.log(error);

        alert("Server error");
    }
}