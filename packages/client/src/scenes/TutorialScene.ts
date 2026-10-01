import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import { getKeyDisplayName, loadKeyBindings } from '../systems/KeyBindings';
import { createNeonTitle, createPanel, drawRetroBackdrop } from '../ui/RetroUI';

// 80s color palette (matching other scenes)
const COLORS = {
  background: 0x0a0a1a,
  neonPink: 0xff00ff,
  neonCyan: 0x00ffff,
  neonYellow: 0xffff00,
  darkPurple: 0x2a0a4a,
};

export class TutorialScene extends Phaser.Scene {
  private currentPage: number = 0;
  private pages: Phaser.GameObjects.Container[] = [];
  private pageIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'TutorialScene' });
  }

  create(): void {
    this.currentPage = 0;
    this.pages = [];

    drawRetroBackdrop(this);
    createNeonTitle(this, 'HOW TO PLAY', 48, 40, '// ARCADE MANUAL');
    createPanel(this, GAME_WIDTH / 2, 280, 520, 360);

    // Page indicator
    this.pageIndicator = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    this.pageIndicator.setOrigin(0.5);

    // Create tutorial pages after the indicator so showPage can update it.
    this.createPages();
    this.showPage(0);

    // Navigation buttons
    this.createNavButton(GAME_WIDTH / 2 - 100, GAME_HEIGHT - 50, '◄ PREV', () => {
      this.prevPage();
    });

    this.createNavButton(GAME_WIDTH / 2 + 100, GAME_HEIGHT - 50, 'NEXT ►', () => {
      this.nextPage();
    });

    // Back button
    this.createNavButton(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'MENU', () => {
      this.scene.start('MenuScene');
    });

    // Keyboard navigation
    this.input.keyboard?.on('keydown-LEFT', () => this.prevPage());
    this.input.keyboard?.on('keydown-RIGHT', () => this.nextPage());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  private createPages(): void {
    const bindings = loadKeyBindings();
    const display = getKeyDisplayName;

    // Page 1: Basic Controls
    const page1 = this.add.container(0, 0);
    this.addPageTitle(page1, 'CONTROLS');
    this.addPageContent(page1, [
      {
        key: `${display(bindings.player1.left)} / ${display(bindings.player1.right)}`,
        desc: 'Move left/right',
      },
      { key: display(bindings.player1.jump), desc: 'Jump' },
      { key: display(bindings.player1.shoot), desc: 'Shoot laser' },
      { key: display(bindings.pause), desc: 'Pause game' },
    ], 120);
    this.addPageNote(
      page1,
      `P2: ${display(bindings.player2.left)}/${display(bindings.player2.right)} move, ` +
        `${display(bindings.player2.jump)} jump, ${display(bindings.player2.shoot)} fire`
    );
    this.pages.push(page1);

    // Page 2: Objective
    const page2 = this.add.container(0, 0);
    this.addPageTitle(page2, 'OBJECTIVE');
    this.addPageText(page2, [
      'Blocks fall from the sky!',
      '',
      'Shoot them before they stack',
      'too high and crush you.',
      '',
      'Destroy blocks to score points.',
      'Build combos for bonus points!',
    ], 130);
    this.pages.push(page2);

    // Page 3: Power-ups
    const page3 = this.add.container(0, 0);
    this.addPageTitle(page3, 'POWER-UPS');
    this.addPageContent(page3, [
      { key: '🌽 CORN', desc: 'Restore health' },
      { key: '👟 SNEAKERS', desc: 'Jump higher (30s)' },
      { key: '⚡ RAPID', desc: 'Fast fire rate (30s)' },
      { key: '🔥 SPREAD', desc: '3-way shot (30s)' },
      { key: '💎 PIERCING', desc: 'Shots go through blocks (30s)' },
    ], 110);
    this.pages.push(page3);

    // Page 4: Tips
    const page4 = this.add.container(0, 0);
    this.addPageTitle(page4, 'TIPS');
    this.addPageText(page4, [
      '• Blocks merge when they touch',
      '  Merged blocks have more HP!',
      '',
      '• Destroy blocks quickly for',
      '  combo multipliers',
      '',
      '• Watch for falling blocks -',
      '  they hurt if they land on you!',
      '',
      '• Power-up timers show in the',
      '  side panel',
    ], 110);
    this.pages.push(page4);

    // Hide all pages initially
    this.pages.forEach(page => page.setVisible(false));
  }

  private addPageTitle(container: Phaser.GameObjects.Container, title: string): void {
    const text = this.add.text(GAME_WIDTH / 2, 90, `─── ${title} ───`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    text.setOrigin(0.5);
    container.add(text);
  }

  private addPageContent(
    container: Phaser.GameObjects.Container,
    items: { key: string; desc: string }[],
    startY: number
  ): void {
    let y = startY;
    items.forEach(item => {
      const keyText = this.add.text(GAME_WIDTH / 2 - 180, y, item.key, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffff00',
      });
      container.add(keyText);

      const descText = this.add.text(GAME_WIDTH / 2 + 20, y, item.desc, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
      });
      container.add(descText);

      y += 35;
    });
  }

  private addPageText(container: Phaser.GameObjects.Container, lines: string[], startY: number): void {
    let y = startY;
    lines.forEach(line => {
      const text = this.add.text(GAME_WIDTH / 2, y, line, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
      });
      text.setOrigin(0.5);
      container.add(text);
      y += 28;
    });
  }

  private addPageNote(container: Phaser.GameObjects.Container, note: string): void {
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 150, note, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    });
    text.setOrigin(0.5);
    container.add(text);
  }

  private createNavButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 90, 34, COLORS.darkPurple, 0.9);
    bg.setStrokeStyle(1, COLORS.neonPink, 0.7);
    const text = this.add.text(x, y, label, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    text.setOrigin(0.5);
    text.setInteractive({ useHandCursor: true });

    text.on('pointerover', () => {
      text.setColor('#00ffff');
      bg.setStrokeStyle(2, COLORS.neonCyan, 1);
    });

    text.on('pointerout', () => {
      text.setColor('#888888');
      bg.setStrokeStyle(1, COLORS.neonPink, 0.7);
    });

    text.on('pointerdown', onClick);
  }

  private showPage(index: number): void {
    this.pages.forEach((page, i) => {
      page.setVisible(i === index);
    });
    this.currentPage = index;
    this.updatePageIndicator();
  }

  private nextPage(): void {
    if (this.currentPage < this.pages.length - 1) {
      this.showPage(this.currentPage + 1);
    }
  }

  private prevPage(): void {
    if (this.currentPage > 0) {
      this.showPage(this.currentPage - 1);
    }
  }

  private updatePageIndicator(): void {
    const dots = this.pages.map((_, i) =>
      i === this.currentPage ? '●' : '○'
    ).join(' ');
    this.pageIndicator.setText(dots);
  }
}
