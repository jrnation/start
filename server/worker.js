const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
};

function handleOptions(request) {
    if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null
    ) {
        return new Response(null, { headers: corsHeaders });
    } else {
        return new Response(null, { headers: { Allow: "GET, HEAD, POST, OPTIONS" } });
    }
}

export default {
    async fetch(request, env, ctx) {
        // 1. Handle CORS Preflight Requests
        if (request.method === "OPTIONS") {
            return handleOptions(request);
        }

        const url = new URL(request.url);
        
        try {
            // 2. Route: GET /leaderboard
            if (url.pathname === "/leaderboard" && request.method === "GET") {
                const { results } = await env.DB.prepare(
                    "SELECT uid, displayName as name, photoUrl as img, totalScore as score, currentStreak as streak FROM users ORDER BY totalScore DESC LIMIT 20"
                ).all();

                // Add rank mapping
                const rankedResults = results.map((user, index) => ({
                    ...user,
                    rank: index + 1
                }));

                return new Response(JSON.stringify(rankedResults), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // 3. Route: GET /profile
            if (url.pathname === "/profile" && request.method === "GET") {
                const uid = url.searchParams.get("uid");
                if (!uid) {
                    return new Response("Missing UID", { status: 400, headers: corsHeaders });
                }

                const user = await env.DB.prepare(
                    "SELECT totalScore, currentStreak, totalQuestions FROM users WHERE uid = ?"
                ).bind(uid).first();

                if (!user) {
                    return new Response(JSON.stringify({ totalScore: 0, currentStreak: 0, accuracy: 0 }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const accuracy = user.totalQuestions > 0 
                    ? Math.round((user.totalScore / user.totalQuestions) * 100) 
                    : 0;

                return new Response(JSON.stringify({
                    totalScore: user.totalScore,
                    currentStreak: user.currentStreak,
                    accuracy: accuracy
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // 4. Route: POST /submit
            if (url.pathname === "/submit" && request.method === "POST") {
                const data = await request.json();
                const { uid, displayName, email, photoUrl, score, date } = data;

                if (!uid || score === undefined || !date) {
                    return new Response("Missing required fields", { status: 400, headers: corsHeaders });
                }

                // Check if user exists
                const existingUser = await env.DB.prepare(
                    "SELECT lastActiveDate, currentStreak, totalScore, totalQuestions FROM users WHERE uid = ?"
                ).bind(uid).first();

                if (!existingUser) {
                    // New user
                    await env.DB.prepare(
                        `INSERT INTO users (uid, displayName, email, photoUrl, totalScore, totalQuestions, currentStreak, lastActiveDate)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                    ).bind(uid, displayName, email, photoUrl, score, 1, 1, date).run();
                } else {
                    // Existing user - calculate streak
                    let newStreak = existingUser.currentStreak;
                    
                    const lastDateObj = new Date(existingUser.lastActiveDate);
                    const currentDateObj = new Date(date);
                    
                    // Calculate absolute day difference
                    const diffTime = currentDateObj.getTime() - lastDateObj.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

                    if (diffDays === 1) {
                        // Played consecutive day
                        newStreak += 1;
                    } else if (diffDays > 1) {
                        // Skipped a day, reset streak
                        newStreak = 1;
                    } else if (diffDays === 0) {
                        // Already played today. Prevent duplicate submission score padding.
                        return new Response("Already played today", { 
                            status: 200, 
                            headers: corsHeaders 
                        });
                    }

                    const newTotalScore = existingUser.totalScore + score;
                    const newTotalQuestions = existingUser.totalQuestions + 1;

                    await env.DB.prepare(
                        `UPDATE users 
                         SET totalScore = ?, totalQuestions = ?, currentStreak = ?, lastActiveDate = ?, displayName = ?, photoUrl = ?
                         WHERE uid = ?`
                    ).bind(newTotalScore, newTotalQuestions, newStreak, date, displayName, photoUrl, uid).run();
                }

                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            return new Response("Not Found", { status: 404, headers: corsHeaders });

        } catch (error) {
            return new Response(error.message, { status: 500, headers: corsHeaders });
        }
    }
};
