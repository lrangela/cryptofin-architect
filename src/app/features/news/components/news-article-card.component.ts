import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { NewsArticle } from '../../../shared/models/news.model';

@Component({
  selector: 'app-news-article-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <article class="news-card">
      <div class="news-card-header">
        <span class="source-badge">{{ article().source }}</span>
        <span class="published-date">{{ article().publishedAt | date:'mediumDate' }}</span>
      </div>
      <div class="news-card-body">
        <h2 class="news-card-title">{{ article().title }}</h2>
        <p class="news-card-description">{{ article().description || 'Sin descripción disponible.' }}</p>
      </div>
      <div class="news-card-footer">
        <a [href]="article().url" target="_blank" rel="noreferrer" class="read-more-link">
          <span>Abrir noticia</span>
          <span class="arrow-icon">→</span>
        </a>
      </div>
    </article>
  `,
  styles: `
    :host { display: contents; }
  `,
  styleUrl: './news-article-card.component.scss',
})
export class NewsArticleCardComponent {
  readonly article = input.required<NewsArticle>();
}
