# Une Phrase 스페인어 파일럿 샘플 — 2026-10-22

배경: 사용자가 2026-10-22 07:21 UTC에 "한 문장 외국어"로 바꾸고 언어별 트랙
(프랑스어·스페인어·영어·러시아어)을 여는 아이디어를 냈다. 메인 에이전트는
조건 3개(진입 시 언어 선택 강제 금지, 언어별 깊이 차이 인정, 러시아어는 검수
자신감 부족으로 보류)와 함께 "스페인어 파일럿 30문장 먼저"를 제안했으나,
사용자는 답 없이 방문자 카운터·백엔드 논의로 넘어갔다. 결정이 돌아왔을 때
긴 설명 대신 샘플 하나로 판정할 수 있게, 30문장이 아니라 판정용 12문장만
미리 뽑아둔 파일이다. 앱 코드는 건드리지 않았다.

## 전제 (메인 에이전트 제안 그대로)

- 켜면 마지막으로 공부한 언어로 바로 시작. 언어 전환은 메뉴 안에서만.
- 프랑스어 286문장·기존 진도·주소는 그대로. TEF 준비 기간이라 프랑스어 본진 우선.
- 스페인어 목표 수준: 대학에서 A를 받고 듀오링고로 유지해 온 사용자의 실제
  수준에 맞춰 B1 중심, 가벼운 B2 패턴 1개(가정법)만 시범으로 포함.
- 러시아어는 이 파일 범위 밖 (보류 권고 유지).

## 파일럿 12문장 (프랑스어 트랙과 같은 3단계 흐름용)

형식: 스페인어 문장 / 한국어 뜻 / 덩어리 쪼개기

1. Normalmente me despierto a las seis, pero hoy me quedé dormido.
   보통은 여섯 시에 일어나는데, 오늘은 늦잠을 잤다.
   Normalmente / me despierto / a las seis, / pero hoy / me quedé dormido.

2. Antes de salir de casa, siempre reviso si llevo las llaves.
   집을 나서기 전에, 열쇠를 챙겼는지 항상 확인한다.
   Antes de salir de casa, / siempre reviso / si llevo las llaves.

3. Trabajo en una cocina, así que paso casi todo el día de pie.
   주방에서 일해서, 거의 하루 종일 서서 지낸다.
   Trabajo en una cocina, / así que / paso casi todo el día / de pie.

4. Aunque el trabajo es duro, me gusta porque siempre aprendo algo nuevo.
   일이 힘들긴 해도, 늘 새로운 걸 배우니까 좋다.
   Aunque el trabajo es duro, / me gusta / porque siempre aprendo / algo nuevo.

5. Creo que aprender un idioma lleva tiempo, pero vale la pena.
   언어를 배우는 데는 시간이 걸리지만, 그만한 가치가 있다고 생각한다.
   Creo que / aprender un idioma / lleva tiempo, / pero vale la pena.

6. Cuando era niño, quería ser ingeniero porque me encantaban las máquinas.
   어렸을 때는 기계를 너무 좋아해서 엔지니어가 되고 싶었다.
   Cuando era niño, / quería ser ingeniero / porque me encantaban / las máquinas.

7. Este año he decidido cuidar más mi salud y dormir mejor.
   올해는 건강을 더 챙기고 잠을 더 잘 자기로 했다.
   Este año / he decidido / cuidar más mi salud / y dormir mejor.

8. No estoy de acuerdo: trabajar desde casa no siempre es más cómodo.
   나는 동의하지 않는다. 재택근무가 항상 더 편한 것은 아니다.
   No estoy de acuerdo: / trabajar desde casa / no siempre / es más cómodo.

9. Para mí, lo importante no es el dinero, sino sentirse útil.
   나에게 중요한 건 돈이 아니라, 쓸모 있는 사람이라는 느낌이다.
   Para mí, / lo importante / no es el dinero, / sino sentirse útil.

10. Ayer fui al médico porque me dolía la espalda desde hacía días.
    며칠째 등이 아파서 어제 병원에 갔다.
    Ayer fui al médico / porque me dolía la espalda / desde hacía días.

11. Si mañana hace buen tiempo, iremos a dar un paseo por el parque.
    내일 날씨가 좋으면 공원에 산책하러 갈 것이다.
    Si mañana / hace buen tiempo, / iremos a dar un paseo / por el parque.

12. Si tuviera más tiempo libre, viajaría por todo el país. (B2 시범 1개)
    여유 시간이 더 있다면 나라 곳곳을 여행할 텐데.
    Si tuviera / más tiempo libre, / viajaría / por todo el país.

## 판정 기준

- 사용자가 이 12문장을 읽고 "이 수준·이 결이면 트랙으로 열 만하다"고 하면
  그때 30문장으로 늘리고 앱 구조 개편(이름 변경 포함)에 들어간다.
- 별로라고 하면 이 파일에서 끝. 프랑스어 앱은 지금 상태가 완성형이다.
- 영어 트랙은 별도 설계가 필요하다 (사용자 실력상 A2·B1 문장은 시시함 —
  고급 패턴 중심으로 따로 뽑아야 한다는 기존 판단 유지).
