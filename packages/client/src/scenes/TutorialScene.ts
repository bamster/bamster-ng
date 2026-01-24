import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';

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
    // Dark background with grid
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Scanlines
    for (let i = 0; i < GAME_HEIGHT; i += 4) {
      graphics.fillStyle(0x000000, 0.1);
      graphics.fillRect(0, i, GAME_WIDTH, 2);
    }

    // Grid lines
    graphics.lineStyle(1, COLORS.neonPink, 0.1);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 40, 'HOW TO PLAY', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 2,
    });
    title.setOrigin(0.5);

    // Create tutorial pages
    this.createPages();

    // Show first page
    this.showPage(0);

    // Page indicator
    this.pageIndicator = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    this.pageIndicator.setOrigin(0.5);
    this.updatePageIndicator();

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
    // Page 1: Basic Controls
    const page1 = this.add.container(0, 0);
    this.addPageTitle(page1, 'CONTROLS');
    this.addPageContent(page1, [
      { key: '← →  or  A D', desc: 'Move left/right' },
      { key: '↑  or  W', desc: 'Jump' },
      { key: 'SPACE', desc: 'Shoot laser' },
      { key: 'ESC  or  P', desc: 'Pause game' },
    ], 120);
    this.addPageNote(page1, 'Player 2 uses WASD + E to shoot');
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
    const text = this.add.text(x, y, label, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    text.setOrigin(0.5);
    text.setInteractive({ useHandCursor: true });

    text.on('pointerover', () => {
      text.setColor('#00ffff');
    });

    text.on('pointerout', () => {
      text.setColor('#888888');
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
