import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
} from 'ng-apexcharts';
import type { CryptoHistorySeries } from '../../../shared/models/crypto.model';

type ComparisonChartOptions = {
  chart: ApexChart;
  colors: string[];
  dataLabels: ApexDataLabels;
  fill: ApexFill;
  grid: ApexGrid;
  legend: ApexLegend;
  markers: ApexMarkers;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
};

@Component({
  selector: 'app-market-comparison-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartComponent],
  template: `
    @if (!isBrowser) {
      <div class="chart-placeholder">
        <h3>Grafica comparativa</h3>
        <p>La grafica se habilita en el navegador.</p>
      </div>
    } @else if (!allSeries().length) {
      <div class="chart-placeholder">
        <h3>Grafica comparativa</h3>
        <p>Agrega coins y espera datos historicos para compararlas.</p>
      </div>
    } @else {
      <section class="chart-shell" aria-label="Comparacion de coins">
        <header class="chart-header">
          <div>
            <p class="eyebrow">Comparacion</p>
            <h3>Series superpuestas</h3>
          </div>

          <div class="chart-actions">
            <div class="mode-toggle" role="tablist" aria-label="Modo de comparacion">
              <button
                type="button"
                [class.is-active]="displayMode() === 'normalized'"
                (click)="setDisplayMode('normalized')"
              >
                Rendimiento %
              </button>
              <button
                type="button"
                [class.is-active]="displayMode() === 'absolute'"
                (click)="setDisplayMode('absolute')"
              >
                Precio USD
              </button>
            </div>
            <p class="chart-caption">{{ caption() }}</p>
          </div>
        </header>

        <div class="legend-row" aria-label="Leyenda de series">
          @for (item of allSeries(); track item.id) {
            <button
              type="button"
              class="legend-chip"
              [class.is-hidden]="!visibleIds().includes(item.id)"
              (click)="toggleSeries.emit(item.id)"
            >
              <span
                class="legend-dot"
                [style.background-color]="colorFor(item.id)"
              ></span>
              <span>{{ item.id.toUpperCase() }}</span>
            </button>
          }
        </div>

        @if (loading()) {
          <p class="loading-note">Actualizando grafica...</p>
        }

        <apx-chart
          [series]="chartSeries()"
          [chart]="options().chart"
          [colors]="options().colors"
          [dataLabels]="options().dataLabels"
          [fill]="options().fill"
          [grid]="options().grid"
          [legend]="options().legend"
          [markers]="options().markers"
          [stroke]="options().stroke"
          [tooltip]="options().tooltip"
          [xaxis]="options().xaxis"
          [yaxis]="options().yaxis"
        />
      </section>
    }
  `,
  styleUrl: './market-comparison-chart.component.scss',
})
export class MarketComparisonChartComponent {
  private readonly platformId = inject(PLATFORM_ID);

  readonly allSeries = input.required<CryptoHistorySeries[]>();
  readonly visibleIds = input.required<string[]>();
  readonly rangeLabel = input.required<string>();
  readonly colorMap = input.required<Record<string, string>>();
  readonly loading = input(false);
  readonly toggleSeries = output<string>();
  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly displayMode = signal<'normalized' | 'absolute'>('normalized');

  readonly chartSeries = computed<ApexAxisChartSeries>(() =>
    this.allSeries()
      .filter((item) => this.visibleIds().includes(item.id) && item.points.length > 0)
      .map((item) => ({
        name: item.id.toUpperCase(),
        data: this.mapSeriesData(item),
      })),
  );

  readonly modeLabel = computed(() =>
    this.displayMode() === 'normalized' ? 'rendimiento %' : 'precio USD',
  );

  readonly caption = computed(
    () => `${this.visibleIds().length} coins · ${this.rangeLabel()} · ${this.modeLabel()}`,
  );

  readonly options = computed<ComparisonChartOptions>(() => ({
    chart: {
      type: 'area',
      height: 360,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { easing: 'easeinout', speed: 350 },
      background: 'transparent',
    },
    colors: this.chartSeries().map((item) =>
      this.colorFor(typeof item.name === 'string' ? item.name.toLowerCase() : ''),
    ),
    dataLabels: { enabled: false },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.18,
        opacityFrom: 0.28,
        opacityTo: 0.02,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
    },
    legend: {
      show: false,
    },
    markers: {
      size: 0,
      hover: { size: 4 },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    tooltip: {
      x: { format: 'dd MMM HH:mm' },
      y: {
        formatter: (value?: number) =>
          value === undefined
            ? ''
            : this.displayMode() === 'normalized'
              ? `${value.toFixed(2)}%`
              : `$${value.toLocaleString('en-US')}`,
      },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        style: { colors: '#6b7280' },
      },
      axisBorder: { color: '#e5e7eb' },
    },
    yaxis: {
      labels: {
        style: { colors: '#6b7280' },
        formatter: (value: number) =>
          this.displayMode() === 'normalized'
            ? `${value.toFixed(0)}%`
            : `$${value.toLocaleString('en-US')}`,
      },
    },
  }));

  protected setDisplayMode(mode: 'normalized' | 'absolute'): void {
    this.displayMode.set(mode);
  }

  protected colorFor(id: string): string {
    return this.colorMap()[id] ?? '#0f766e';
  }

  private mapSeriesData(item: CryptoHistorySeries) {
    const basePrice = item.points[0]?.priceUsd ?? 1;

    return item.points.map((point) => ({
      x: new Date(point.timestamp).getTime(),
      y:
        this.displayMode() === 'normalized'
          ? Number(((point.priceUsd / basePrice) * 100).toFixed(2))
          : Number(point.priceUsd.toFixed(2)),
    }));
  }
}
