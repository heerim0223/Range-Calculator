# 💡 개요
입력받은 두 MGRS 좌표간의 거리를 계산해주는 계산기입니다.


## 📋 구현시 중요한 사항
#### 1. 편평도 고려
![Image](https://github.com/user-attachments/assets/f67e5173-e648-4eeb-b0a9-16f837f3efba)

지구가 완벽한 구 형태가 아니라는 점을 고려하여 최대한 오차 범위를 줄이고자 지구의 형태와 가장 유사한 세계 지구 좌표 시스템인 WGS-84 모델을 사용합니다.

또한 동일 좌표계 내의 두 좌표의 거리를 계산하는 동시에 오차 범위를 줄이기 위해 Haversine Formula를 사용하는 대신 WGS-84 모델을 기준으로 Vincenty's Formula를 사용합니다.

#### 2. 위경도 계산
![Image](https://github.com/user-attachments/assets/e547187a-191a-4f77-a712-951cd6e9c933)

입력받은 MGRS 좌표를 UTM 좌표계 내의 위경도로 치환합니다.


> 1. MGRS -> UTM 변환
>
> 2. UTM ->  경위도(WGS-84) 변환
>
> 3. Vincenty Formula로 두 점의 지리적 거리 계산


## 📝 선행 개념
### MGRS(Military_Grid_Reference_System)
> [Zone Number][Latitude Band][100,000m Grid Square][Easting/Northing]
>
> ex) 52SCH1234567890
>
> 52[Zone Number],
> S[Latitude Band],
> CH[100,000m Grid Square],
> 1234567890[Easting/Northing]

#### 1. Zone Number(1~60)
  지구를 경도 단위로 나는 UTM 존 번호입니다.
  ![Image](https://github.com/user-attachments/assets/f0a98788-e945-4706-9fda-aabb3580ba71)

#### 2. Latitude Band
  위도를 8도씩 나눈 대문자 문자로, C(80°S ~ 72°S)부터 X(72°N ~ 84°N)까지.(단, I와 O는 사용하지 않음)
  ![Image](https://github.com/user-attachments/assets/a8bb38c3-2045-46dd-bcca-a92d530f0b9e)

#### 3. 100,000m Grid Square
  두 개의 문자로, 각각(Easting)과 북쪽(Northig) 100km 사각형을 나타냅니다.
  ex) WN, AB
  ![Image](https://github.com/user-attachments/assets/f69f0b87-520e-4dc1-9ae5-3b4e3504a344)

#### 4. Easting/Northing
  위치의 세부 좌표로, 보통 짝수 자리수로 표현됩니다.
  - 1234567890일 경우, 12(4계단), 123(6계단), 1234(8계단), 12345(10계단). (정밀도 수준에 따라 다릅니다.)
  - 짝수로 표현(Easting, Northing이 각각 절반)


# 📊 계산에 필요한 공식
### Vincenty Formula(Inverse Problem)

#### 1. 필요한 상수값(WGS-84 기준)
```
두 지점의 위도/경도: (φ1, λ1, φ2, λ2)
적도 반지름(meter): (a = 6378137)
타원체 편평률: (f = 1 / 298.257223563)
극반지름: (b = a * (1 - f))
```

#### 2. 경위도를 라디안으로 변환
```
φ1 = RADIANS(Lat1)
φ2 = RADIANS(Lat2)
L = RADIANS(λ2 - λ1)
```

#### 3. U1, U2 보조 위도 계산
```
U1 = ATAN((1 - f) * TAN(φ1))
U2 = ATAN((1 - f) * TAN(φ2))
```

#### 4. 초기 λ = L로 설정하고, 아래 수식을 여러 번 반복(Iteration)
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

#### 5. 신규 λ가 이전 값과 거의 같아질 때까지 반복(보통 5~8회 정도)

#### 6. 마지막 거리 계산
```
u² = cos²α * (a^2 - b^2) / b^2
A = 1 + u²/16384*(4096 + u²*(-768 + u²*(320 - 175*u²)))
B = u²/1024 * (256 + u²*(-128 + u²*(74 - 47*u²)))
Δσ = B*sinσ*(cos2σm + B/4*(cosσ*(-1 + 2*cos2σm^2) - B/6*cos2σm*(-3 + 4*sinσ^2)*(-3 + 4*cos2σm^2)))
Distance = b*A*(σ - Δσ)
```

# ❓ MGRS는 군사기밀인가요?
아니요, **MGRS(Military Grid Reference System)** 자체는 군사기밀이 아닙니다.

MGRS는 **전 세계 공용 좌표계**인 UTM(Universal Transverse Mercator)과 UPS(Universal Polar Stereographic)를 기반으로 만들어진 군사용 그리드 시스템이에요.  
즉, **좌표 표현 방식**일 뿐이며, NATO나 미군, 여러 국가에서 지도상 위치를 간단히 표현하기 위해 사용하고 있습니다.

다만 **MGRS 좌표를 포함한 군 작전계획서, 실제 군사 위치 데이터**는 군사기밀이 될 수 있습니다.  
즉, "MGRS 시스템" 자체는 공개된 기술이고 누구나 사용할 수 있지만, **MGRS로 표기된 특정 위치 데이터**가 군사정보에 포함된다면 기밀이 될 가능성이 높습니다.

### ✅ MGRS가 공개된 이유
- NATO STANAG 표준 문서로 등록되어 있음
- GIS(지리정보시스템) 분야에서도 자유롭게 사용
- 오픈소스 라이브러리로도 구현 가능

**(위와 같은 이유로 해당 프로젝트는 실제 군에서 활용하는 정보를 일절 사용하지 않았습니다.)**

### 요약:
- 📌 **MGRS 시스템** = 공개
- 📌 **MGRS 좌표에 담긴 군사정보** = 상황에 따라 군사기밀 가능



# 🔍 도움을 준 사이트
- Earth Point(https://www.earthpoint.us/Convert.aspx)
- Wikipedia_MGRS(https://en.wikipedia.org/wiki/Military_Grid_Reference_System)
- Wikipedia_Vincenty's formulae(https://en.wikipedia.org/wiki/Vincenty%27s_formulae)
- Wikipedia_wgs84(https://ko.wikipedia.org/wiki/%EC%84%B8%EA%B3%84_%EC%A7%80%EA%B5%AC_%EC%A2%8C%ED%91%9C_%EC%8B%9C%EC%8A%A4%ED%85%9C)
- Tistory_QGIS(https://grizzy-bear-blog.tistory.com/22)
