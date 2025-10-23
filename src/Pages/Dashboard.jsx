// src/components/Dashboard.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, Container, Row, Col } from "react-bootstrap";
import MainNavbar from "./MainNavbar";
import Footer from "./Footer"; // ✅ Import Footer

// ✅ Import images properly (works after build & deploy)
import documentsImg from "../assets/documents.png";
import investmentImg from "../assets/investment.png";
import moviesImg from "../assets/movies_series.png";
import transactionImg from "../assets/transaction_new.png";
import workDetailsImg from "../assets/work_details.png";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigate on card click
  const handleCardClick = (path) => {
    navigate(path);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="dashboard-container">
      {/* Navbar (forced fixed via CSS below) */}
      <MainNavbar />

      {/* Fixed footer */}
      <Footer />

      {/* Only this section scrolls */}
      <div className="dashboard-scroll">
        <div className="manage-details-banner">Manage All Personal Details</div>

        {/* Dashboard Content */}
        <Container className="dashboard-content">
          <div className="cards-container mt-4">
            <Row xs={1} md={2} lg={3} xl={5} className="g-4">
              {/* Documents */}
              <Col>
                <Card
                  className="clickable-card documents-card"
                  onClick={() => handleCardClick("/document")}
                >
                  <Card.Body>
                    <Card.Title>Documents</Card.Title>
                    <Card.Img variant="top" src={documentsImg} />
                  </Card.Body>
                </Card>
              </Col>

              {/* Investment */}
              <Col>
                <Card
                  className="clickable-card investment-card"
                  onClick={() => handleCardClick("/investment")}
                >
                  <Card.Body>
                    <Card.Title>Investment</Card.Title>
                    <Card.Img variant="top" src={investmentImg} />
                  </Card.Body>
                </Card>
              </Col>

              {/* Movies & Series */}
              <Col>
                <Card
                  className="clickable-card movies-card"
                  onClick={() => handleCardClick("/movies-series")}
                >
                  <Card.Body>
                    <Card.Title>Movies & Series</Card.Title>
                    <Card.Img variant="top" src={moviesImg} />
                  </Card.Body>
                </Card>
              </Col>

              {/* Transaction */}
              <Col>
                <Card
                  className="clickable-card transaction-card"
                  onClick={() => handleCardClick("/transaction")}
                >
                  <Card.Body>
                    <Card.Title>Transaction</Card.Title>
                    <Card.Img variant="top" src={transactionImg} />
                  </Card.Body>
                </Card>
              </Col>

              {/* Work Details */}
              <Col>
                <Card
                  className="clickable-card work-details-card"
                  onClick={() => handleCardClick("/work-details")}
                >
                  <Card.Body>
                    <Card.Title>Work Details</Card.Title>
                    <Card.Img
                      variant="top"
                      src={workDetailsImg}
                      style={{ height: "200px", objectFit: "contain" }}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Inline CSS */}
      <style>
        {`
          :root{
            /* Adjust these if navbar/footer heights change */
            --top-strip: 6px;
            --nav-core: 86px;
            --nav-h: calc(var(--top-strip) + var(--nav-core));
            --footer-h: 110px;
          }

          .dashboard-container {
            min-height: 100vh;
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .top-strip {
            position: fixed !important;
            top: 0; left: 0; right: 0;
            z-index: 1200;
          }
          .custom-navbar {
            position: fixed !important;
            top: var(--top-strip);
            left: 0; right: 0;
            z-index: 1190;
          }

          .dashboard-container .pro-footer {
            position: fixed !important;
            left: 0; right: 0; bottom: 0;
            z-index: 1030;
            display: block;
          }

          @media (max-width: 576px) {
            .dashboard-container .pro-footer {
              height: 30px;
              display: block;
            }
          }

          .dashboard-scroll {
            position: relative;
            height: calc(100vh - var(--nav-h) - var(--footer-h));
            margin-top: var(--nav-h);
            margin-bottom: var(--footer-h);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .dashboard-content {
            padding: 20px;
            margin-top: 0;
            flex: 0 0 auto;
          }

          .cards-container {
            margin-top: 30px;
            margin-bottom: 30px;
          }

          .card {
            cursor: pointer;
            border-radius: 15px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .card img {
            max-height: 200px;
            object-fit: contain;
            width: 100%;
            border-radius: 10px;
            margin-bottom: 10px;
          }
          .card:hover {
            transform: translateY(-10px);
            box-shadow: 0 12px 20px rgba(0, 0, 0, 0.1);
          }

          .documents-card { background-color: #ffeb3b; color: #000; }
          .investment-card { background-color: #4caf50; color: #fff; }
          .movies-card { background-color: #2196f3; color: #fff; }
          .transaction-card { background-color: #f44336; color: #fff; }
          .work-details-card { background-color: #9c27b0; color: #fff; }

          .manage-details-banner {
            font-family: 'Poppins', 'Segoe UI', sans-serif;
            font-weight: 800;
            font-size: 1.6rem;
            color: #d22212ff;
            background: linear-gradient(90deg, #e0eafc, #cfdef3);
            padding: 14px 24px;
            border-radius: 12px;
            text-align: center;
            margin: 60px auto 10px;
            max-width: 680px;
            box-shadow: 0 6px 16px rgba(0,0,0,0.08);
            letter-spacing: 0.5px;
          }

          @media (max-width: 992px){
            :root{
              --nav-core: 82px;
              --footer-h: 120px;
            }
          }
          @media (max-width: 768px){
            .card { margin-bottom: 20px; }
            :root{ --nav-core: 78px; }
          }
          @media (max-width: 576px){
            .card { margin-bottom: 10px; }
            :root{ --nav-core: 74px; }
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;
