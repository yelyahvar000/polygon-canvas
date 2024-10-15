import React, { useRef, useState, useEffect } from "react";

const PolygonCanvas = () => {
  const canvasRef = useRef(null); // Reference to the canvas element
  const [points, setPoints] = useState([]); // Array of points to draw
  const [draggingPin, setDraggingPin] = useState(null); // Track dragging point
  const [backgroundImage, setBackgroundImage] = useState(null); // Store background image
  const [pulseRadius, setPulseRadius] = useState(10); // Pulsing radius of the last pin
  const [pulseGrowing, setPulseGrowing] = useState(true); // Toggle pulsing animation
  const [firstPinFixed, setFirstPinFixed] = useState(false); // Is the first pin placed?
  const pointsOutputRef = useRef(null); // Reference to JSON output textarea
  const pointsInputRef = useRef(null); // Reference to JSON input textarea
  const matchMessageRef = useRef(null); // Reference to match message display

  const pinRadius = 10; // Default radius for fixed pins

  // Function to draw the polygon
  const drawPolygon = () => {
	  const canvas = canvasRef.current;
	  if (!canvas) return;

	  const ctx = canvas.getContext("2d");
	  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

	  // Draw the background image if available
	  if (backgroundImage) {
		ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
	  }

	  // Draw the polygon lines if there are more than one point
	  if (points.length > 1) {
		ctx.beginPath();
		ctx.moveTo(points[0]?.x || 0, points[0]?.y || 0); // Safe check for the first point
		points.forEach((point, i) => {
		  if (i > 0 && point?.x !== undefined && point?.y !== undefined) { // Safe check for each point
			ctx.lineTo(point.x, point.y);
		  }
		});
		ctx.strokeStyle = "blue";
		ctx.lineWidth = 2;
		ctx.stroke();
	  }

	  // Draw the first pin as a fixed circle (green)
	  if (points.length > 0 && points[0]?.x !== undefined && points[0]?.y !== undefined) {
		const firstPoint = points[0];
		ctx.beginPath();
		ctx.arc(firstPoint.x, firstPoint.y, pinRadius, 0, Math.PI * 2);
		ctx.fillStyle = "green";
		ctx.fill();
	  }

	  // Draw the last pin as a pulsing circle (red)
	  if (points.length > 1) {
		const lastPoint = points[points.length - 1];
		if (lastPoint?.x !== undefined && lastPoint?.y !== undefined) { // Safe check for last point
		  ctx.beginPath();
		  ctx.arc(lastPoint.x, lastPoint.y, pulseRadius, 0, Math.PI * 2);
		  ctx.fillStyle = "red";
		  ctx.fill();
		}
	  }
	};


  // Handle pulsing effect for the last pin
  const pulseEffect = () => {
    setPulseRadius((prevRadius) => {
      if (prevRadius >= 15) {
        setPulseGrowing(false);
        return prevRadius - 0.5;
      } else if (prevRadius <= 10) {
        setPulseGrowing(true);
        return prevRadius + 0.5;
      } else {
        return pulseGrowing ? prevRadius + 0.5 : prevRadius - 0.5;
      }
    });
  };

  // Animation loop
  useEffect(() => {
    const animationLoop = () => {
      pulseEffect();
      drawPolygon(); // Redraw the canvas with the new pulse radius
      requestAnimationFrame(animationLoop); // Continue the animation loop
    };

    requestAnimationFrame(animationLoop); // Start the animation loop
  }, [pulseRadius, pulseGrowing, points]);

  // Handle mouse click to place points
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!firstPinFixed) {
      setPoints([{ x, y }]); // First pin placement
      setFirstPinFixed(true);
    } else {
      setPoints((prevPoints) => [...prevPoints, { x, y }]); // Add new points
    }
  };

  // Handle mouse down (start dragging the last pin)
  const handleMouseDown = (e) => {
    if (points.length === 0) return; // Ensure points exist

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lastPoint = points[points.length - 1];

    // Calculate distance to the last pin
    const distance = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
    if (distance <= pulseRadius) {
      setDraggingPin(lastPoint);
    }
  };

  // Handle mouse move (drag the pin)
  const handleMouseMove = (e) => {
    if (draggingPin) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update the dragged pin's position
      setPoints((prevPoints) =>
        prevPoints.map((p) =>
          p === draggingPin ? { ...draggingPin, x, y } : p
        )
      );
    }
  };

  // Stop dragging on mouse up
  const handleMouseUp = () => {
    setDraggingPin(null); // Stop dragging
  };

  // Handle image upload for background
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img); // Set the background image
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file); // Load the image
    }
  };

  // JSON handling
  const handleJSONGenerate = () => {
    pointsOutputRef.current.value = JSON.stringify(points); // Display points as JSON
  };

  // Redraw points from JSON with animation
  const handleRedrawFromJSON = () => {
    const inputData = pointsInputRef.current.value.trim();
    try {
      const parsedPoints = JSON.parse(inputData); // Parse input JSON

      if (Array.isArray(parsedPoints) && parsedPoints.length >= 2) {
        setFirstPinFixed(true); // Fix the first pin
        setPoints([]); // Clear existing points
        let i = 0;

        // Function to animate drawing of points from JSON
        const animateRedraw = () => {
          if (i < parsedPoints.length) {
            setPoints((prevPoints) => [...prevPoints, parsedPoints[i]]);
            i++;
            setTimeout(animateRedraw, 200); // Delay between each point draw
          }
        };

        animateRedraw(); // Start the redraw animation

        matchMessageRef.current.textContent = "Redrawing from JSON...";
        matchMessageRef.current.style.color = "green";
      } else {
        throw new Error("Invalid format");
      }
    } catch (error) {
      matchMessageRef.current.textContent = "Invalid JSON format.";
      matchMessageRef.current.style.color = "red";
    }
  };

  // Backspace to Undo functionality
  useEffect(() => {
    const handleUndo = (e) => {
      if (e.key === "Backspace" && points.length > 1) {
        e.preventDefault(); // Prevent the browser from navigating back
        setPoints((prevPoints) => prevPoints.slice(0, -1)); // Remove the last point
      }
    };

    // Attach the event listener for keydown
    window.addEventListener("keydown", handleUndo);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleUndo);
    };
  }, [points]);

  return (
    <div>
      <h2>Click to Add Polygon Points, Drag Last Pin, Use Backspace to Undo</h2>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      ></canvas>

      <h3>Points as JSON</h3>
      <textarea ref={pointsOutputRef} rows="5" cols="100" readOnly></textarea>
      <br />
      <button onClick={handleJSONGenerate}>Generate Points JSON</button>

      <h3>Paste Points JSON to Redraw</h3>
      <textarea ref={pointsInputRef} rows="5" cols="100"></textarea>
      <br />
      <button onClick={handleRedrawFromJSON}>Redraw from JSON (Animated)</button>

      <h3>Upload Background Image</h3>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <p ref={matchMessageRef}></p>
    </div>
  );
};

export default PolygonCanvas;
