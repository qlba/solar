const {PI, sin, cos, tan, asin, atan, acos} = Math;

const rad = PI / 180;

const dayMs = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;

function toJulian(date)
{
	return date.valueOf() / dayMs - 0.5 + J1970;
}

function fromJulian(j)
{
	return new Date((j + 0.5 - J1970) * dayMs);
}

function toDays(date)
{
	return toJulian(date) - J2000;
}

const e = rad * 23.4397;

function rightAscension(l, b)
{
	return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
}

function declination(l, b)
{
	return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
}

function azimuth(H, phi, dec)
{
	return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
}

function altitude(H, phi, dec)
{
	return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
}

function siderealTime(d, lw)
{
	return rad * (280.16 + 360.9856235 * d) - lw;
}

function astroRefraction(h)
{
	if (h < 0)
		h = 0;

	return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
}

function solarMeanAnomaly(d)
{
	return rad * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M)
{
	const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M));
	const P = rad * 102.9372;

	return M + C + P + PI;
}

function sunCoords(d)
{
	const M = solarMeanAnomaly(d);
	const L = eclipticLongitude(M);

	return {
		dec: declination(L, 0),
		ra: rightAscension(L, 0)
	};
}

function getPosition(date, lat, lng)
{
	const lw = rad * -lng;
	const phi = rad * lat;
	const d = toDays(date);

	const c = sunCoords(d);
	const H = siderealTime(d, lw) - c.ra;

	return {
		azimuth: azimuth(H, phi, c.dec),
		altitude: altitude(H, phi, c.dec)
	};
};

function moonCoords(d)
{
	const L = rad * (218.316 + 13.176396 * d); // ecliptic longitude
	const M = rad * (134.963 + 13.064993 * d); // mean anomaly
	const F = rad * (93.272 + 13.229350 * d); // mean distance

	const l  = L + rad * 6.289 * sin(M); // longitude
	const b  = rad * 5.128 * sin(F); // latitude
	const dt = 385001 - 20905 * cos(M); // distance to the moon in km

	return {
		ra: rightAscension(l, b),
		dec: declination(l, b),
		dist: dt
	};
}

function getMoonPosition(date, lat, lng)
{
	const lw = rad * -lng;
	const phi = rad * lat;
	const d = toDays(date);

	const c = moonCoords(d);
	const H = siderealTime(d, lw) - c.ra;
	const pa = atan(sin(H), tan(phi) * cos(c.dec) - sin(c.dec) * cos(H));

	let h = altitude(H, phi, c.dec);
	h = h + astroRefraction(h); // altitude correction for refraction

	return {
		azimuth: azimuth(H, phi, c.dec),
		altitude: h,
		distance: c.dist,
		parallacticAngle: pa
	};
};

function getMoonIllumination(date)
{
	const d = toDays(date || new Date());
	const s = sunCoords(d);
	const m = moonCoords(d);

	const sdist = 149598000;

	const phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra));
	const inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi));
	const angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) -
		cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));

	return {
		fraction: (1 + cos(inc)) / 2,
		phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
		angle: angle
	};
};

module.exports = {
	astro: {
		e,
		rightAscension,
		declination,
		azimuth,
		altitude,
		siderealTime,
		astroRefraction
	},
	solar: {
		solarMeanAnomaly,
		eclipticLongitude,
		sunCoords,
		getPosition,
	},
	lunar: {
		moonCoords,
		getMoonPosition,
		getMoonIllumination
	},
	time: {
		dayMs,
		J1970,
		J2000,
		toJulian,
		fromJulian,
		toDays
	},
	rad
};
