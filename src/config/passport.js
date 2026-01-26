const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Member = require('../models/Member');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            let member = await Member.findOne({ email });

            if (member) {
                // Mettre à jour googleId si nécessaire (cas où l'utilisateur se connecte avec Google pour un compte existant)
                if (!member.googleId) {
                    member.googleId = profile.id;
                    await member.save();
                }
                return done(null, member);
            } else {
                // Créer automatiquement le membre
                const newMember = new Member({
                    googleId: profile.id,
                    email: email,
                    nom: profile.name.familyName || ' ',
                    prenom: profile.name.givenName || ' ',
                    isVerified: true,
                    status: 'En attente',
                    profileCompleted: false
                    // Les autres champs seront remplis via /profile/complete
                });

                await newMember.save();
                return done(null, newMember);
            }
        } catch (err) {
            return done(err, null);
        }
    }));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await Member.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
