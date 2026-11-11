<template>
  <!-- 배경 사진: 도쿄타워 야경 (Unsplash 무료 이미지). 위에 남색을 덮어 글씨가 잘 보이게 -->
  <div class="backdrop" aria-hidden="true" :style="{ backgroundImage: `url(${src})` }">
    <!-- 타워 불빛 숨쉬기: 같은 사진을 '밝은 부분만 더 밝게'(screen) 겹쳐 천천히 켰다 껐다 -->
    <div class="glow" :style="{ backgroundImage: `url(${src})` }" />
    <!-- 별똥별: 왼쪽 위에서 오른쪽 아래로, 빛나는 머리가 앞장서고 꼬리는 뒤(위)로 -->
    <div class="sky">
      <span v-for="(m, i) in meteors" :key="i" class="meteor" :style="m" />
    </div>
  </div>
</template>

<script>
// 별똥별 하나하나의 시작 위치·길이·속도·쉬는 시간을 조금씩 다르게 (매번 같은 자리에서 안 떨어지게)
const rand = (a, b) => a + Math.random() * (b - a)

export default {
  name: 'TowerBackdrop',
  data () {
    return { meteors: [] }
  },
  computed: {
    // GitHub Pages 에선 /travel/ 아래에 있으므로 router base 를 붙임
    src () {
      return `${this.$router.options.base || '/'}tower.jpg`
    }
  },
  mounted () {
    // 8개를 하늘 곳곳에 뿌림
    this.meteors = Array.from({ length: 8 }, (_, i) => ({
      top: `${rand(-10, 55)}%`,
      left: `${rand(-20, 80)}%`,
      '--len': `${Math.round(rand(80, 200))}px`,
      // 한 바퀴(떨어지는 시간 + 쉬는 시간). 실제로 보이는 건 앞쪽 짧은 순간뿐
      animationDuration: `${rand(6, 11).toFixed(1)}s`,
      animationDelay: `${(i * 1.2 + rand(0, 1.5)).toFixed(1)}s`
    }))
  }
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-size: cover;
  /* 사진 오른쪽의 타워가 휴대폰 세로 화면에서도 보이게 */
  background-position: 72% center;
  background-repeat: no-repeat;
}
/* 남색 막: 야경은 살리고, 글씨는 또렷하게 (위쪽은 진하게, 아래는 사진이 더 보이게) */
.backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(12, 18, 28, 0.9) 0%, rgba(12, 18, 28, 0.8) 55%, rgba(12, 18, 28, 0.66) 100%);
}

/* 남색 막 "위에" 겹침 → 불빛이 막에 가려지지 않고 또렷하게 숨 쉼 */
.glow {
  position: absolute;
  inset: 0;
  z-index: 1;
  background-size: cover;
  background-position: 72% center;
  background-repeat: no-repeat;
  mix-blend-mode: screen; /* 검은 부분은 그대로, 밝은 부분만 더해짐 */
  /* 흑백으로 바꿔 밝은 곳만 남기고(하늘은 새까맣게), 그 불빛을 주황·금빛으로 물들여 살짝 번지게 */
  filter: grayscale(1) contrast(5) brightness(0.85) sepia(1) saturate(6) hue-rotate(-12deg) blur(2px);
  opacity: 0.05;
  animation: breathe 5s ease-in-out infinite;
}
@keyframes breathe {
  0%, 100% { opacity: 0.05; }
  50% { opacity: 0.8; }
}

/* 별똥별은 남색 막 위에 (글씨보다는 뒤) */
.sky {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
}
.meteor {
  position: absolute;
  width: var(--len);
  height: 2px;
  /* 머리는 밝고 꼬리는 사라지게 */
  background: linear-gradient(to left, rgba(255, 250, 235, 0.95), rgba(255, 220, 170, 0.35) 40%, transparent);
  border-radius: 2px;
  opacity: 0;
  transform: rotate(35deg) translateX(0);
  transform-origin: right center;
  animation-name: fall;
  animation-timing-function: ease-in;
  animation-iteration-count: infinite;
}
/* 반짝이는 머리 */
.meteor::after {
  content: '';
  position: absolute;
  right: -2px;
  top: 50%;
  width: 4px;
  height: 4px;
  margin-top: -2px;
  border-radius: 50%;
  background: #fffaf0;
  box-shadow: 0 0 8px 2px rgba(255, 240, 210, 0.8);
}
/* 한 바퀴 중 앞 10% 동안만 오른쪽 아래로 휙 지나가고, 나머지는 쉼 */
@keyframes fall {
  0% { opacity: 0; transform: rotate(35deg) translateX(0); }
  1.5% { opacity: 1; }
  8% { opacity: 1; }
  11% { opacity: 0; transform: rotate(35deg) translateX(520px); }
  100% { opacity: 0; transform: rotate(35deg) translateX(520px); }
}
/* 움직임 줄이기 설정을 켠 기기에서는 별똥별 없음 */
@media (prefers-reduced-motion: reduce) {
  .sky { display: none; }
  .glow { animation: none; }
}
</style>
