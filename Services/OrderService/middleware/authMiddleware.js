import session from '../security/session.cjs';
import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  try {
    const token = session.accessToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing"
      });
    }

    const decodedUser = jwt.verify(
      token,
      process.env.JWT_SECRET, { algorithms: ['HS256'] }
    );

    req.user = decodedUser;

    return session.csrfProtection()(req, res, next);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token"
    });
  }
};