/* Mission Planner part 1: mission model + scoring math.
   Classic script: extends window.Planner. */
'use strict';

(function () {
    const P = window.Planner;

    // Days per duration choice, and crew size per team choice.
    P.DURATION_DAYS = { '1 Week': 7, '1 Month': 30, '6 Months': 180 };
    P.CREW_SIZE = { 'Solo': 1, '2-Person': 2, 'Full Crew': 4 };

    // Science value per mission type (0-100), normalised later.
    P.SCIENCE_BASE = { 'Exploration': 70, 'Resource Survey': 55, 'Scientific Outpost': 90 };

    // Terrain risk: derived from the site's roughness and slope discipline.
    // Higher mean roughness or lower slope discipline => higher risk.
    P.terrainRisk = function (site) {
        const roughRisk = Math.min(1, site.meanRough / 5.0);
        const slopeRisk = 1 - site.slopeDiscipline;
        return Math.round((roughRisk * 0.6 + slopeRisk * 0.4) * 100);
    };

    // Mission cost proxy: scales with duration (days), crew size, and distance
    // from Earth (Moon is farthest, Mars next, Earth sites are cheapest).
    P.DISTANCE_FACTOR = { 'Earth': 1.0, 'Mars': 4.0, 'Moon': 8.0 };
    P.missionCost = function (plan, site) {
        const days = P.DURATION_DAYS[plan.Duration] || 30;
        const crew = P.CREW_SIZE[plan['Team Size']] || 2;
        const dist = P.DISTANCE_FACTOR[site.body] || 1;
        // Cost proxy: crew * days * distance factor, scaled to a 0-100 index.
        return Math.min(100, Math.round((crew * days * dist) / 40));
    };

    // Science value: mission-type base, scaled by terrain suitability.
    // Sites with more flat area and lower roughness suit science outposts better.
    P.scienceValue = function (plan, site) {
        const base = P.SCIENCE_BASE[plan['Mission Type']] || 60;
        const areaBonus = Math.min(20, site.area / 25);
        const roughPenalty = Math.min(20, site.meanRough * 4);
        return Math.max(0, Math.round(base + areaBonus - roughPenalty));
    };

    // Weighted viability score (0-100) combining science, cost and risk.
    P.viability = function (plan, site) {
        const science = P.scienceValue(plan, site);
        const cost = P.missionCost(plan, site);
        const risk = P.terrainRisk(site);
        const w = P.weights;
        // Lower cost and risk are better; invert them.
        const score = (science * w.science) + ((100 - cost) * w.cost) + ((100 - risk) * w.risk);
        return Math.round(score);
    };

    // Rank every catalogued site for the current plan, best first.
    P.rankSites = function (plan) {
        return Object.values(window.SITE_DATA)
            .map(s => {
                const risk = P.terrainRisk(s);
                const cost = P.missionCost(plan, s);
                const science = P.scienceValue(plan, s);
                const score = P.viability(plan, s);
                return { site: s, score, risk, cost, science };
            })
            .sort((a, b) => b.score - a.score);
    };
})();