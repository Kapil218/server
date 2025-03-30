import passport from "passport";
import githubPkg from "passport-github2";
import googlePkg from "passport-google-oauth20";

const GoogleStrategy = googlePkg.Strategy;
const GitHubStrategy = githubPkg.Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    function (request, accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  )
);
export default passport;
