import dotenv from "dotenv";
import createApp from "./app.js";

dotenv.config();

const app = createApp();
const port = Number(process.env.PORT) || 5173;

app.listen(port, () => {
  console.info(
    `Mock backend API (MOCK_API=${process.env.MOCK_API || "false"}) listening on http://localhost:${port}`
  );
});
