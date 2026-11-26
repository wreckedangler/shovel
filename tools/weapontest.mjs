import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { levelById } from '../src/levels.js';
import { finishWeapons, hasRoyalChests } from '../src/weapons.js';

const game = (id, weapon, shovel = 0) => new Game(levelById(id), { shovel, armor: 0, weapon });
const unlocks = g => g.events.filter(e => e.name === 'unlock').map(e => e.v);
function touch(g, e) {
  Object.assign(g.p, { x: e.x, y: e.y });
  g.contacts();
}
function swing(g) {
  g.p.hits = new Set();
  g.swing();
}

// Die Grenzwerte zählen im aktuellen Lauf, auch beim Wiederholen eines Levels.
const moss = game('1-1');
moss.frame = 1200;
assert.deepEqual(finishWeapons(moss, []), []);
moss.frame--;
assert.deepEqual(finishWeapons(moss, []), ['blitzspaten']);
moss.coins.push(moss.highCoin);
assert(finishWeapons(moss, []).includes('federklinge'));
moss.hurtCount++;
assert(!finishWeapons(moss, []).includes('federklinge'));
const fastGhost = { frames: moss.frame + 359 };
assert(!finishWeapons(moss, [fastGhost]).includes('geisterklinge'));
fastGhost.frames++;
assert(finishWeapons(moss, [fastGhost]).includes('geisterklinge'));
assert(!finishWeapons(moss, [{ ...fastGhost, own: true }]).includes('geisterklinge'));
const roots = game('1-2');
roots.exit = 'secret';
assert(!finishWeapons(roots, []).includes('erdfresser'));
for (const row of roots.tiles) for (let i = 0; i < row.length; i++) if (row[i] === 'D') row[i] = '.';
assert(finishWeapons(roots, []).includes('erdfresser'));
const worm = game('Q-2');
worm.p.hp = 1;
assert(finishWeapons(worm, []).includes('seelenschaufel'));
worm.deaths++;
assert(!finishWeapons(worm, []).includes('seelenschaufel'));
const chests = { '1-1:2:3': true, '1-2:3:4': true, '1-3:5:6': true, '1-G:1:1': true };
assert(!hasRoyalChests(chests));
assert(hasRoyalChests({ ...chests, '2-G:9:3': true }));

const crypt = game('X-0');
const altar = crypt.ents.find(e => e.type === 'altar');
touch(crypt, altar);
assert(!altar.taken);
for (const coin of crypt.ents.filter(e => e.type === 'coin')) touch(crypt, coin);
assert.equal(crypt.coins.length, 3);
crypt.deaths = 1;
touch(crypt, altar);
assert(!altar.taken);
crypt.deaths = 0;
touch(crypt, altar);
touch(crypt, altar);
assert.deepEqual(unlocks(crypt), ['spuerschaufel']);

const ridge = game('1-3');
const sky = ridge.ents.find(e => e.type === 'altar');
const bowl = ridge.ents.find(e => e.type === 'brazier');
touch(ridge, bowl);
touch(ridge, sky);
assert(ridge.carryingEmber);
assert.deepEqual(unlocks(ridge), []);
ridge.p.inv = 0;
ridge.hurtPlayer(1, 1);
assert(!ridge.carryingEmber && !sky.taken);
touch(ridge, bowl);
assert.deepEqual(unlocks(ridge), []);
touch(ridge, sky);
touch(ridge, bowl);
touch(ridge, bowl);
assert.deepEqual(unlocks(ridge), ['urfunke']);

// Die tatsächlich benutzte Magnetreichweite stammt aus Waffe, Rüstung und Relikt.
for (const [weapon, relics, distance, attracts] of [
  [null, {}, 45, false], [null, { magnet: 1 }, 45, false],
  [null, { magnet: 2 }, 45, true], ['goldschaufel', {}, 90, true],
]) {
  const g = new Game(levelById('1-1'), { shovel: 0, armor: 0, weapon }, { relics });
  const gem = g.ents.find(e => e.type === 'gem');
  gem.x = g.p.x + distance;
  gem.y = g.p.y;
  const before = gem.x;
  gem.update(g, gem);
  assert.equal(gem.x < before, attracts);
}

const flame = game('1-1', 'urfunke');
for (let i = 0; i < 3; i++) { swing(flame); flame.swing(); }
assert.equal(flame.ents.filter(e => e.kind === 'ember').length, 1);
const claw = game('1-1', 'maulwurfkralle');
claw.p.onGround = true;
swing(claw);
assert.deepEqual(claw.ents.filter(e => e.kind === 'wave').map(e => e.vx).sort(), [-3, 3]);
const soul = game('Q-2', 'seelenschaufel');
soul.kill(true);
assert(soul.rushT > 0 && soul.p.hp === soul.p.maxhp && soul.deaths === 0);
soul.kill(true);
assert.equal(soul.deaths, 1);
const pendulum = game('2-B');
pendulum.startBoss();
swing(pendulum);
pendulum.bossDefeated(pendulum.boss);
assert(!unlocks(pendulum).includes('pendelhammer'));
for (const shovel of [0, 1]) {
  const mole = game('1-B', null, shovel);
  mole.bossDefeated(mole.boss);
  assert.equal(unlocks(mole).includes('maulwurfkralle'), shovel === 0);
}
console.log('Waffenprüfungen, Altäre und Spezialeffekte bestanden.');
