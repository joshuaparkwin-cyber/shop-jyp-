module.exports = async function handler(req, res) {
  const GEMINI_KEY = process.env.GEMINI_KEY;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`
  );
  const data = await response.json();
  const names = (data.models || []).map(m => m.name);
  res.status(200).json({ models: names });
};
