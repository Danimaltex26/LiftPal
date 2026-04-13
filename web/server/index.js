// Local dev entry. Vercel uses api/index.js instead.
import app from "./app.js";

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`LiftPal server listening on port ${PORT}`);
});
