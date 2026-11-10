// dist/ (npm run build:pages 결과)를 GitHub 의 gh-pages 브랜치로 올림
// 빌드할 때 dist/ 가 통째로 새로 만들어지므로 매번 git 을 새로 만들고 강제로 올림 (gh-pages 는 결과물만 있는 브랜치)
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const dist = path.join(__dirname, '..', 'dist')
const repo = 'https://github.com/dongugchoi/travel.git'

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html 이 없어요. 먼저 npm run build:pages 를 실행하세요.')
  process.exit(1)
}

const run = cmd => execSync(cmd, { cwd: dist, stdio: 'inherit' })
fs.rmSync(path.join(dist, '.git'), { recursive: true, force: true })
run('git init -q -b gh-pages')
run('git config core.autocrlf false')
run('git add -A')
run(`git commit -q -m "Deploy ${new Date().toISOString()}"`)
run(`git push -f ${repo} gh-pages`)
console.log('\n배포 완료: https://dongugchoi.github.io/travel/ (반영까지 1~2분)')
