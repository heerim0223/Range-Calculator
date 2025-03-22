# 개요
입력받은 두 MGRS 좌표간의 거리를 계산해주는 계산기입니다.

# ㅇ
## 1. 편평도 고려
지구가 완벽한 구 형태가 아니라는 점을 고려하여 최대한 오차 범위를 줄이고자 지구의 형태와 가장 유사한 세계 지구 좌표 시스템인 WGS-84 모델을 사용합니다.

또한 동일 좌표계 내의 두 좌표의 거리를 계산하는 동시에 오차 범위를 줄이기 위해 Haversine Formula를 사용하는 대신 WGS-84 모델을 기준으로 Vincenty's Formula를 사용합니다.

## 2. 위경도 계산
입력받은 MGRS 좌표를 UTM 좌표계 내의 위경도로 치환합니다.


1. MGRS -> UTM 변환

2. UTM ->  경위도(WGS-84) 변환

3. Vincenty Formula로 두 점의 지리적 거리 계산


## 구현 제한 고려

매크로, VBA, 인터넷 등이 사용불가한 공간 내에서 구현을 해야한다는 한계를 고려합니다.

# 선행 개념
## MGRS
> [Zone Number][Latitude Band][100,000m Grid Square][Easting/Northing]

1. Zone Number(1~60)
  ![Image](https://github.com/user-attachments/assets/f0a98788-e945-4706-9fda-aabb3580ba71)

2. Latitude Band
  ![Image](https://github.com/user-attachments/assets/a8bb38c3-2045-46dd-bcca-a92d530f0b9e)

3. 100,000m Grid Square
  ![Image](https://github.com/user-attachments/assets/f69f0b87-520e-4dc1-9ae5-3b4e3504a344)

4. Easting/Northing


#
## Vincenty Formula(Inverse Problem)

1. 필요한 상수값(WGS-84 기준)
```
두 지점의 위도/경도: (φ1, λ1, φ2, λ2)
적도 반지름(meter): (a = 6378137)
타원체 편평률: (f = 1 / 298.257223563)
극반지름: (b = a * (1 - f))
```

### 2. 경위도를 라디안으로 변환
```
φ1 = RADIANS(Lat1)
φ2 = RADIANS(Lat2)
L = RADIANS(λ2 - λ1)
```

### 3. U1, U2 보조 위도 계산
```
U1 = ATAN((1 - f) * TAN(φ1))
U2 = ATAN((1 - f) * TAN(φ2))
```

### 4. 초기 λ = L로 설정하고, 아래 수식을 여러 번 반복(Iteration)
```
sinσ = SQRT((COS(U2)*SIN(λ))^2 + (COS(U1)*SIN(U2) - SIN(U1)*COS(U2)*COS(λ))^2)
cosσ = SIN(U1)*SIN(U2) + COS(U1)*COS(U2)*COS(λ)
σ = ATAN2(sinσ, cosσ)
sinα = COS(U1)*COS(U2)*SIN(λ) / sinσ
cos²α = 1 - sinα^2
cos2σm = cosσ - (2*SIN(U1)*SIN(U2)/cos²α)
C = f/16*cos²α*(4+f*(4-3*cos²α))
λ_new = L + (1-C)*f*sinα*(σ + C*sinσ*(cos2σm + C*cosσ*(-1+2*cos2σm^2)))
```

### 5. 신규 λ가 이전 값과 거의 같아질 때까지 반복(보통 5~8회 정도)

### 6. 마지막 거리 계산
```
u² = cos²α * (a^2 - b^2) / b^2
A = 1 + u²/16384*(4096 + u²*(-768 + u²*(320 - 175*u²)))
B = u²/1024 * (256 + u²*(-128 + u²*(74 - 47*u²)))
Δσ = B*sinσ*(cos2σm + B/4*(cosσ*(-1 + 2*cos2σm^2) - B/6*cos2σm*(-3 + 4*sinσ^2)*(-3 + 4*cos2σm^2)))
Distance = b*A*(σ - Δσ)
```

