import React, { useEffect, useState, useRef } from "react";
import "./Hero.css";
function Hero() {
  const [scrollPercent, setScrollPercent] = useState(0);
  const ballRef = useRef(0); // For smooth easing

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.scrollY;
      const targetPercent = (scrollTop / scrollHeight) * 100;

      // Smooth easing
      const animate = () => {
        ballRef.current += (targetPercent - ballRef.current) * 0.05; // 0.05 = easing factor
        setScrollPercent(ballRef.current);
        if (Math.abs(ballRef.current - targetPercent) > 0.1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero" id="hero">
        <div className="hero-bg">
          <div className="tech-line"></div>
          <div className="tech-line"></div>
          <div className="tech-line"></div>
          <div className="tech-line"></div>
          <div className="tech-line"></div>
        </div>

        <div className="hero-content">
          <h1>
            Land Your Dream Job with <span>Prime Resume</span>
          </h1>
          <p>
            Upload your resume and instantly get an ATS score, insights, and tips
            to beat the competition.
          </p>
          <div className="hero-buttons">
            <a href="/upload" className="btn primary">Upload Resume</a>
            <a href="/about" className="btn secondary">Learn More</a>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="why-us" id="why-us">
        <h2 className="why-us-title">WHY US ?</h2>

        <div className="why-us-container">
          <div className="scroll-indicator">
            <div className="scroll-ball" style={{ top: `${scrollPercent}%` }}></div>
          </div>
          {/* Content Points */}
          <div className="why-us-points">
            <div className="point left">
              <div className="point-content">
                <h3>Free and Open Source</h3>
                <p>Completely free to use and open for contributions from the community.</p>
              </div>
            </div>
            <div className="point right">
              <div className="point-content">
                <h3>Built by Engineers, for Engineers</h3>
                <p>Designed by someone who understands the challenges engineers face when applying for jobs.</p>
              </div>
            </div>
            <div className="point left">
              <div className="point-content">
                <h3>Instant ATS Score</h3>
                <p>Get quick, real-time feedback on how well your resume matches ATS standards.</p>
              </div>
            </div>
            <div className="point right">
              <div className="point-content">
                <h3>Practical Suggestions</h3>
                <p>Helpful tips to improve keywords, formatting, and skill alignment for your target roles.</p>
              </div>
            </div>
            <div className="point left">
              <div className="point-content">
                <h3>Stay on Trend</h3>
                <p>Keep your skills current by matching your resume to the latest role-based trends.</p>
              </div>
            </div>
            <div className="point right">
              <div className="point-content">
                <h3>Perfect Formatting Tips</h3>
                <p>Make sure your resume’s structure is optimized for ATS readability and scanning.</p>
              </div>
            </div>
            <div className="point left">
              <div className="point-content">
                <h3>Identify Skill Gaps</h3>
                <p>Spot missing skills with insights to help you better target your dream job.</p>
              </div>
            </div>
            <div className="point right">
              <div className="point-content">
                <h3>Career-Focused Recommendations</h3>
                <p>Personalized ideas that align with your goals and the roles you want.</p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}

export default Hero;
