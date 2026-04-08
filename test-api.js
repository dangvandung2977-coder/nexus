const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
  // Hardcoded for testing since this is a temporary script
  const apiKey = "AIzaSyCtGa94HasrhE2sDAf0FXWQmIuttNM9qVw";
  const modelName = "gemini-3.1-flash-lite-preview";
  
  console.log("Testing Gemini API...");
  console.log("Model:", modelName);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent("Hello, are you working? Please respond with 'YES, I AM WORKING' if you receive this.");
    const response = await result.response;
    const text = response.text();
    console.log("Response:", text);
    if (text.includes("WORKING")) {
      console.log("-----------------------------------------");
      console.log("SUCCESS: API is working correctly!");
      console.log("-----------------------------------------");
    } else {
      console.log("API responded but message was unexpected:", text);
    }
  } catch (error) {
    console.error("FAILURE: API returned an error:");
    console.error(error.message);
  }
}

testGemini();
