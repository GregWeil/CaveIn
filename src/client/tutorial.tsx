/// tutorial.tsx
// The tutorial page

import { h, Component } from 'hyperapp';

const Tutorial: Component = () => (
  <div id="-tutorial-page" class="page inverse">
    <h1>Instructions</h1>

    <h2>Player</h2>
    <p><img src="/assets/player.gif"/></p>
    <h3>Movement</h3>
    <p>Use WASD or arrow keys to move</p>
    <h3>Attacking</h3>
    <p><img src="/assets/3.gif"/><br/>- Use SPACE to swing your pickaxe</p>
    <p><img src="/assets/1.gif"/><br/>- with it, you can mine out blocks</p>
    <p>
      <img src="/assets/2.gif"/>
      <img src="/assets/4.gif"/>
      <br/>- or kill enemies
      <br/>- or just swing in midair
    </p>

    <h2>Enemies</h2>
    <h3>Creeps</h3>
    <p><img src="/assets/enemy.gif"/></p>
    <p>Every time you mine a block, a creep will spawn<br/><br/>Upon defeat, they will drop a block</p>
    <h3>Spooks</h3>
    <p><img src="/assets/spook.gif"/></p>
    <p>These are the ghosts of creeps that have died in a cave in</p>
    <p>Their souls possess the blocks that crushed them</p>
    <p>You must get rid of them before you can break the blocks they inhabit</p>

    <h2>Gems</h2>
    <p>
      <img src="/assets/gem1.gif"/>
      <img src="/assets/gem2.gif"/>
      <img src="/assets/gem3.gif"/>
    </p>
    <p>Collect these to increase your score</p>
    <p><img src="/assets/gem1.gif"/> - this gem gives you 1 point and will remove all surrounding blocks and enemies</p>
    <p><img src="/assets/gem2.gif"/> - this gem gives you 3 points and will only remove the immediate blocks in the 4 cardinal directions from it</p>
    <p><img src="/assets/gem3.gif"/> - this gem just gives you 5 points</p>

    <h2>Gameplay</h2>
    <p>The goal of the game is to get as many points as possible without running into an enemy</p>
    <p>The game plays in a turn-based structure where every action you make takes one turn<br/><br/>Enemies will move every other turn after they are spawned</p>
    <h3>The Catch</h3>
    <p>You only ever have one room<br/><br/>If you seal off a section of the room, that entire section will be lost</p>

    <h2>Good Luck and Have Fun!</h2>

    <h2><a href="#">back to menu</a></h2>
  </div>
);

export default Tutorial;