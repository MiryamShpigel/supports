import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { QueryBuilderComponent } from '../features/query-builder/query-builder.component/query-builder.component';
import { ResultsComponent } from '../features/results/results.component/results.component';
import { SavedQueriesComponent } from '../features/saved-queries/saved-queries.component/saved-queries.component';
import { QueryStore } from '../state/query.store';

@Component({
  selector: 'app-root',
  imports: [MatIconModule, QueryBuilderComponent, ResultsComponent, SavedQueriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class App implements OnInit {
  private readonly store = inject(QueryStore);

  ngOnInit(): void {
    void this.store.init();
  }
}
