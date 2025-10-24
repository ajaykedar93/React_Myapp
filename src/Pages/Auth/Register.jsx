import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Using useNavigate hook for navigation
import { Spinner, Modal, Button } from "react-bootstrap"; // Importing React Bootstrap components for modal

const Register = () => {
  const [adminName, setAdminName] = useState("");
  const [role] = useState("Admin"); // Default role set to Admin
  const [email, setEmail] = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [alternateMobileNumber, setAlternateMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [highestEducation, setHighestEducation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // success or error message type
  const navigate = useNavigate(); // Using useNavigate hook for navigation

  const API_BASE_URL = "https://express-backend-myapp.onrender.com/api/admin"; // Ensure the API URL is correct for your backend

  // Check if an admin already exists on page load
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/check-one-admin`)
      .then((response) => {
        if (response.data.message === "Only one admin exists") {
          setIsRegistered(true); // Admin already exists, prevent further registration
        }
      })
      .catch((error) => {
        console.error("Error checking admin:", error);
      });
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setProfilePhoto(file);
    } else {
      setErrorMessage("File size should be less than 5MB.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation checks
    if (!adminName || !email || !mobileNumber || !password || !dob) {
      setErrorMessage("All required fields must be filled.");
      return;
    }

    // Check email and mobile validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const mobileRegex = /^[0-9]{10}$/;

    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email.");
      return;
    }

    if (!mobileRegex.test(mobileNumber)) {
      setErrorMessage("Please enter a valid mobile number.");
      return;
    }

    // Check password complexity
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,20}$/;
    if (!passwordRegex.test(password)) {
      setErrorMessage("Password must be at least 6 characters long, contain one letter, one number, and one special character.");
      return;
    }

    // Prepare form data for submission
    const formData = new FormData();
    formData.append("admin_name", adminName);
    formData.append("role", role);
    formData.append("email", email);
    formData.append("alternate_email", alternateEmail);
    formData.append("mobile_number", mobileNumber);
    formData.append("alternate_mobile_number", alternateMobileNumber);
    formData.append("address", address);
    formData.append("dob", dob);
    formData.append("password_hash", password);
    formData.append("highest_education", highestEducation);
    formData.append("profile_photo", profilePhoto);

    setIsSubmitting(true);

    // API call to submit registration data
    axios
      .post(`${API_BASE_URL}/register`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((response) => {
        setIsSubmitting(false);
        if (response.data.message) {
          setErrorMessage("");
          setSuccessMessage("Admin registered successfully!");
          setModalType("success"); // Show success modal
          setShowModal(true); // Show success modal
          // Redirect to login page after successful registration
          setTimeout(() => navigate("/login"), 3000); // Redirect after 3 seconds
        }
      })
      .catch((error) => {
        setIsSubmitting(false);
        if (error.response && error.response.data) {
          setErrorMessage(error.response.data.error || "Registration failed. Please try again.");
          setModalType("error"); // Show error modal
          setShowModal(true); // Show error modal
        } else {
          setErrorMessage("Network error. Please try again.");
          setModalType("error"); // Show error modal
          setShowModal(true); // Show error modal
        }
      });
  };

  // Modal close handler
  const handleCloseModal = () => {
    setShowModal(false); // Close modal
    setErrorMessage(""); // Clear error message
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div
        className="card p-4"
        style={{
          backgroundColor: "#f3e6f5",
          borderColor: "#8e1f4c",
          width: "600px", // Increased card width
          animation: "fadeIn 1s ease-out", // Smooth animation for card
        }}
      >
        {!isRegistered ? (
          <>
            <h3 className="text-center">Admin Registration</h3>
            <form onSubmit={handleSubmit}>
              {/* Admin Name and Email */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="adminName" className="form-label">Admin Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
              </div>

              {/* Alternate Email and Mobile Number */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="alternateEmail" className="form-label">Alternate Email (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    id="alternateEmail"
                    value={alternateEmail}
                    onChange={(e) => setAlternateEmail(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="mobileNumber" className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    className="form-control"
                    id="mobileNumber"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
              </div>

              {/* Alternate Mobile Number and Address */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="alternateMobileNumber" className="form-label">Alternate Mobile Number (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="alternateMobileNumber"
                    value={alternateMobileNumber}
                    onChange={(e) => setAlternateMobileNumber(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="address" className="form-label">Address (Optional)</label>
                  <textarea
                    className="form-control"
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ height: "100px" }}
                  />
                </div>
              </div>

              {/* Date of Birth and Password */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="dob" className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    id="dob"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
              </div>

              {/* Highest Education and Profile Photo */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="highestEducation" className="form-label">Highest Education (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="highestEducation"
                    value={highestEducation}
                    onChange={(e) => setHighestEducation(e.target.value)}
                    style={{ height: "40px" }}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="profilePhoto" className="form-label">Profile Photo (Optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    id="profilePhoto"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-danger w-100" disabled={isSubmitting}>
                {isSubmitting ? <Spinner animation="border" size="sm" /> : "Register"}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-3 text-center">
              <a href="/login">Login here</a>
            </div>
          </>
        ) : (
          <div className="text-center">
            <h4>Only one admin allowed.</h4>
            <small>Admin already present.</small>
          </div>
        )}

        {/* Modal for Success/Error */}
        <Modal show={showModal} onHide={handleCloseModal}>
          <Modal.Header closeButton>
            <Modal.Title>{modalType === "success" ? "Success" : "Error"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{modalType === "success" ? successMessage : errorMessage}</Modal.Body>
          <Modal.Footer>
            <Button variant={modalType === "success" ? "success" : "danger"} onClick={handleCloseModal}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default Register;
