// mgrs -> utm -> wgs84
// WGS84 타원체 상수
const a = 6378137;
const f = 1 / 298.257223563;
const k0 = 0.9996;
const e = Math.sqrt(f * (2 - f));

function mgrsToLatLon(mgrs) {
    // Step 1: 파싱 (예: "52S CH 45678 17890")
    const zoneNumber = parseInt(mgrs.substring(0, 2), 10);
    const latitudeBand = mgrs[2];
    const gridSquare = mgrs.substring(3, 5);
    const remainder = mgrs.substring(5).trim().replace(/\s+/g, '');
    const precision = remainder.length / 2;

    const easting100k = getEasting100k(gridSquare[0], zoneNumber);
    const northing100k = getNorthing100k(gridSquare[1], zoneNumber);

    const easting = easting100k + parseInt(remainder.substring(0, precision).padEnd(5, '0'), 10);
    let northing = northing100k + parseInt(remainder.substring(precision).padEnd(5, '0'), 10);

    // Step 2: 남반구 처리
    const hemisphere = (latitudeBand >= 'N') ? 'N' : 'S';
    if (hemisphere === 'S' && northing < 10000000) {
        northing += 10000000;
    }

    // Step 3: UTM → 경위도 변환
    const { latitude, longitude } = utmToLatLon(zoneNumber, easting, northing, hemisphere);
    return { latitude, longitude };
}

// 100k Grid easting 계산
function getEasting100k(columnLetter, zoneNumber) {
    const columnLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const colSet = ((zoneNumber - 1) % 3);
    const colBase = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'][colSet];
    const idx = colBase.indexOf(columnLetter);
    return (idx + 1) * 100000;
}

// 100k Grid northing 계산
function getNorthing100k(rowLetter, zoneNumber) {
    const rowLetters = 'ABCDEFGHJKLMNPQRSTUV';
    let idx = rowLetters.indexOf(rowLetter);
    let northing = idx * 100000;
    const latBand = getLatBand(zoneNumber);
    while (northing < latBand) {
        northing += 2000000;
    }
    return northing;
}

// 위도 밴드로부터 최소 northing 값 계산
function getLatBand(zoneNumber) {
    const latBands = "CDEFGHJKLMNPQRSTUVWX";
    const bandMins = [
        -80, -72, -64, -56, -48, -40, -32, -24, -16, -8,
        0, 8, 16, 24, 32, 40, 48, 56, 64, 72
    ];
    return (bandMins[zoneNumber - 1] || 0) * 100000;
}

// UTM → 경위도 변환
function utmToLatLon(zone, easting, northing, hemisphere) {
    const e1sq = e * e / (1 - e * e);
    const x = easting - 500000;
    const y = northing;
    const n = a / Math.sqrt(1 - Math.pow(e * Math.sin(0), 2));

    const lonOrigin = (zone - 1) * 6 - 180 + 3;

    const M = y / k0;
    const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));

    let phi1Rad = mu;
    for (let i = 0; i < 5; i++) { // 수렴 반복
        const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
        const phi1RadNew = mu
            + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu)
            + (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu)
            + (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu)
            + (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);
        if (Math.abs(phi1RadNew - phi1Rad) < 1e-10) break;
        phi1Rad = phi1RadNew;
    }

    const N1 = a / Math.sqrt(1 - Math.pow(e * Math.sin(phi1Rad), 2));
    const T1 = Math.pow(Math.tan(phi1Rad), 2);
    const C1 = e1sq * Math.pow(Math.cos(phi1Rad), 2);
    const R1 = a * (1 - e * e) / Math.pow(1 - Math.pow(e * Math.sin(phi1Rad), 2), 1.5);
    const D = x / (N1 * k0);

    const lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4) / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) * Math.pow(D, 6) / 720);
    const lon = lonOrigin + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * Math.pow(D, 5) / 120) / Math.cos(phi1Rad);

    return {
        latitude: lat * (180 / Math.PI),
        longitude: lon
    };
}

// 두 mgrs 좌표간의 거리 계산
function vincentyDistance(lat1, lon1, lat2, lon2) {
    // WGS-84 constants
    const a = 6378137;
    const f = 1 / 298.257223563;
    const b = a * (1 - f);

    // Convert degrees to radians
    const toRad = (deg) => deg * Math.PI / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const L = toRad(lon2 - lon1);

    // Reduced latitudes
    const U1 = Math.atan((1 - f) * Math.tan(φ1));
    const U2 = Math.atan((1 - f) * Math.tan(φ2));

    let λ = L;
    let λ_prev;
    const maxIter = 100;
    const ε = 1e-12; // Convergence threshold

    let sinσ, cosσ, σ, sinα, cosSqα, cos2σm, C;

    for (let i = 0; i < maxIter; i++) {
        const sinλ = Math.sin(λ);
        const cosλ = Math.cos(λ);

        sinσ = Math.sqrt(
            Math.pow(Math.cos(U2) * sinλ, 2) +
            Math.pow(Math.cos(U1) * Math.sin(U2) - Math.sin(U1) * Math.cos(U2) * cosλ, 2)
        );

        if (sinσ === 0) return 0; // Coincident points

        cosσ = Math.sin(U1) * Math.sin(U2) + Math.cos(U1) * Math.cos(U2) * cosλ;
        σ = Math.atan2(sinσ, cosσ);
        sinα = (Math.cos(U1) * Math.cos(U2) * sinλ) / sinσ;
        cosSqα = 1 - sinα * sinα;

        cos2σm = cosSqα !== 0 ? (cosσ - 2 * Math.sin(U1) * Math.sin(U2) / cosSqα) : 0; // Equatorial line
        C = (f / 16) * cosSqα * (4 + f * (4 - 3 * cosSqα));

        λ_prev = λ;
        λ = L + (1 - C) * f * sinα * (σ + C * sinσ * (cos2σm + C * cosσ * (-1 + 2 * cos2σm * cos2σm)));

        if (Math.abs(λ - λ_prev) < ε) break; // Converged
    }

    // u²
    const uSq = cosSqα * (a * a - b * b) / (b * b);
    const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

    const Δσ = B * sinσ * (cos2σm + (B / 4) * (cosσ * (-1 + 2 * cos2σm * cos2σm) - (B / 6) * cos2σm * (-3 + 4 * sinσ * sinσ) * (-3 + 4 * cos2σm * cos2σm)));

    const s = b * A * (σ - Δσ); // 최종 거리 (meter)
    return s;
}

const FirstPosition = mgrsToLatLon("52SCH456178"); // 첫 번째 mgrs 좌표
const SecondPosition = mgrsToLatLon("52SCH100400"); // 두 번째 mgrs 좌표

// 두 좌표간의 거리 출력
const d = vincentyDistance(FirstPosition.latitude,FirstPosition.longitude,SecondPosition.latitude,SecondPosition.longitude);
console.log(`두 좌표간의 거리: ${(d / 1000).toFixed(3)} km`);

// 추가해야하는 요소: input, button, buttonEventListner, output
