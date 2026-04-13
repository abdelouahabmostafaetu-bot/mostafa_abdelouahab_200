from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "images" / "blog" / "cut-point-trick"

FOREST = "#174d43"
ACCENT = "#c4513e"
SOFT = "#8fa7a1"
TEXT = "#183a34"


def setup_matplotlib() -> None:
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "savefig.facecolor": "white",
            "font.family": "DejaVu Serif",
            "mathtext.fontset": "stix",
            "text.color": TEXT,
            "axes.titlecolor": TEXT,
        }
    )


def finish_axes(ax, xlim=(0, 1), ylim=(0, 1)) -> None:
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.set_aspect("equal")
    ax.axis("off")


def make_cut_point_guide() -> None:
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.2), constrained_layout=True)

    lw = 5.5
    point_size = 180

    ax = axes[0]
    finish_axes(ax)
    ax.set_title("The Real Line", fontsize=18, pad=12, fontweight="semibold")
    ax.plot([0.08, 0.92], [0.62, 0.62], color=FOREST, lw=lw, solid_capstyle="round")
    ax.scatter([0.5], [0.62], s=point_size, color=ACCENT, zorder=3)
    ax.plot([0.12, 0.38], [0.28, 0.28], color=FOREST, lw=lw, solid_capstyle="round")
    ax.plot([0.62, 0.88], [0.28, 0.28], color=FOREST, lw=lw, solid_capstyle="round")
    ax.plot([0.5, 0.5], [0.52, 0.38], color=SOFT, lw=2.2, linestyle=(0, (5, 5)))
    ax.text(0.5, 0.08, r"$\mathbb{R}\setminus\{p\}$ splits into two components", ha="center", fontsize=14)

    ax = axes[1]
    finish_axes(ax)
    ax.set_title("The Circle", fontsize=18, pad=12, fontweight="semibold")
    ax.add_patch(Circle((0.5, 0.6), 0.26, fill=False, ec=FOREST, lw=lw))
    ax.scatter([0.76], [0.6], s=point_size, color=ACCENT, zorder=3)
    theta = [t / 100 * 2.55 for t in range(101)]
    # faint surviving arc after deleting a point
    import math

    x = [0.5 + 0.26 * math.cos(math.pi + a) for a in theta]
    y = [0.6 + 0.26 * math.sin(math.pi + a) for a in theta]
    ax.plot(x, y, color=SOFT, lw=2.2, linestyle=(0, (5, 5)))
    ax.text(0.5, 0.08, r"$S^1\setminus\{p\}$ stays connected", ha="center", fontsize=14)

    ax = axes[2]
    finish_axes(ax)
    ax.set_title("The T-Shape", fontsize=18, pad=12, fontweight="semibold")
    ax.plot([0.15, 0.85], [0.72, 0.72], color=FOREST, lw=lw, solid_capstyle="round")
    ax.plot([0.5, 0.5], [0.72, 0.2], color=FOREST, lw=lw, solid_capstyle="round")
    ax.scatter([0.5], [0.72], s=point_size, color=ACCENT, zorder=3)
    ax.plot([0.15, 0.37], [0.72, 0.72], color=SOFT, lw=2.2, linestyle=(0, (5, 5)))
    ax.plot([0.63, 0.85], [0.72, 0.72], color=SOFT, lw=2.2, linestyle=(0, (5, 5)))
    ax.plot([0.5, 0.5], [0.52, 0.2], color=SOFT, lw=2.2, linestyle=(0, (5, 5)))
    ax.text(0.5, 0.08, r"Deleting the center creates three components", ha="center", fontsize=14)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_DIR / "cut-point-visual-guide.svg", format="svg", bbox_inches="tight")
    plt.close(fig)


def make_punctured_space_proof() -> None:
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.5), constrained_layout=True)

    lw = 5.5
    point_size = 160

    ax = axes[0]
    finish_axes(ax)
    ax.set_title("Punctured Plane", fontsize=18, pad=12, fontweight="semibold")
    ax.add_patch(Circle((0.44, 0.55), 0.18, fill=False, ec=SOFT, lw=1.8))
    ax.scatter([0.44], [0.55], s=point_size, color=ACCENT, zorder=4)
    import math

    t = [2 * math.pi * i / 240 for i in range(241)]
    x = [0.44 + 0.12 * math.cos(a) for a in t]
    y = [0.55 + 0.12 * math.sin(a) for a in t]
    ax.plot(x, y, color=FOREST, lw=3.5)
    s = [2 * math.pi * i / 240 for i in range(241)]
    x2 = [0.44 + 0.28 * math.cos(a) for a in s]
    y2 = [0.55 + 0.28 * math.sin(a) for a in s]
    ax.plot(x2, y2, color=FOREST, lw=lw, alpha=0.25)
    ax.annotate(
        "",
        xy=(0.8, 0.74),
        xytext=(0.64, 0.66),
        arrowprops=dict(arrowstyle="->", lw=2.4, color=ACCENT),
    )
    ax.text(0.82, 0.76, "loop around the hole", fontsize=13, color=TEXT, va="center")
    ax.text(0.5, 0.09, r"$\mathbb{R}^2\setminus\{0\}\simeq S^1,\qquad \pi_1\cong \mathbb{Z}$", ha="center", fontsize=15)

    ax = axes[1]
    finish_axes(ax)
    ax.set_title(r"Higher Dimensions, $n\geq 3$", fontsize=18, pad=12, fontweight="semibold")
    ax.add_patch(Circle((0.35, 0.57), 0.2, fill=False, ec=FOREST, lw=3.8))
    ax.add_patch(Ellipse((0.35, 0.57), 0.4, 0.12, fill=False, ec=SOFT, lw=1.8))
    ax.add_patch(Ellipse((0.35, 0.57), 0.12, 0.4, fill=False, ec=SOFT, lw=1.8))
    ax.scatter([0.35], [0.57], s=point_size, color=ACCENT, zorder=4)
    ax.add_patch(Circle((0.78, 0.72), 0.08, fill=False, ec=FOREST, lw=3.2))
    ax.add_patch(Ellipse((0.78, 0.72), 0.16, 0.045, fill=False, ec=SOFT, lw=1.5))
    ax.annotate(
        "",
        xy=(0.7, 0.68),
        xytext=(0.48, 0.62),
        arrowprops=dict(arrowstyle="->", lw=2.4, color=ACCENT),
    )
    ax.text(0.72, 0.63, "radial retract", fontsize=13, color=TEXT)
    ax.text(0.5, 0.09, r"$\mathbb{R}^n\setminus\{0\}\simeq S^{n-1},\qquad \pi_1=0$", ha="center", fontsize=15)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_DIR / "punctured-space-proof.svg", format="svg", bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    setup_matplotlib()
    make_cut_point_guide()
    make_punctured_space_proof()


if __name__ == "__main__":
    main()
