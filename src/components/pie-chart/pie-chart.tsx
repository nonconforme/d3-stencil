import { Component, Element, Prop, Method } from '@stencil/core';
import objectAssignDeep from 'object-assign-deep';
import { select, event } from 'd3-selection';
import { arc, pie } from 'd3-shape';
import { IGraph, IGraphData } from './../../interfaces';
import { Resize } from './../../decorators';
import {
  initTooltipIfExists,
  initLegendIfExists,
  formatter,
  circularFind
} from './../../utils';
import { DEFAULT_GRAPH_DATA_PIE } from './../../shared';

@Component({
  tag: 'pie-chart',
  styleUrl: 'pie-chart.scss'
})
export class PieChart implements IGraph {
  @Prop() graphData: IGraphData;
  @Element() pieChartEl: HTMLElement;
  graphDataMerged: IGraphData;
  svg: any;
  root: any;
  width: number;
  height: number;
  radius: number;
  labelArc: any;
  pie: any;
  tooltipEl: any;
  legendEl: any;

  componentWillLoad(): void {
    this.graphDataMerged = objectAssignDeep(
      { ...DEFAULT_GRAPH_DATA_PIE },
      this.graphData
    );
  }

  componentDidLoad(): void {
    this.svg = select(this.pieChartEl.getElementsByTagName('svg')[0]);
    this.height = this.svg.node().getBoundingClientRect().height;
    this.tooltipEl = initTooltipIfExists(this.pieChartEl, 'tooltip').component;
    this.legendEl = initLegendIfExists(
      this.pieChartEl,
      'legend',
      this.eventsLegend.bind(this)
    ).component;
    this.drawChart();
  }

  @Method()
  updateGraphData(graphData: IGraphData): void {
    this.graphDataMerged = objectAssignDeep(
      { ...DEFAULT_GRAPH_DATA_PIE },
      graphData
    );
    this.drawChart();
  }

  @Resize()
  drawChart(): void {
    if (this.hasData()) {
      this.width = this.svg.node().getBoundingClientRect().width;
      this.radius = Math.min(this.width, this.height) / 2;
      this.reSetRoot();

      const circularArc = arc()
        .innerRadius(0)
        .outerRadius(this.radius);

      this.pie = this.root
        .selectAll('.arc')
        .data(
          pie()
            .sort(null)
            .value(data => data)(this.graphDataMerged.data[0])
        )
        .enter()
        .append('g')
        .attr('class', 'arc');

      this.pie
        .append('path')
        .attr('d', circularArc)
        .attr('stroke', '#FFF')
        .attr('fill', (_, index) =>
          circularFind(this.graphDataMerged.colors, index)
        )
        .on('mousemove', data => this.eventsTooltip({ data, isToShow: true }))
        .on('mouseout', () => this.eventsTooltip({ isToShow: false }));

      this.createLabels();
    }
  }

  hasData(): boolean | Error {
    return this.graphDataMerged.hasDataMethod(this.graphDataMerged);
  }

  reSetRoot(): void {
    if (this.root) {
      this.root.remove();
    }

    this.root = this.svg
      .append('g')
      .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
  }

  createLabels(): void {
    this.labelArc = arc()
      .innerRadius(this.radius - 40)
      .outerRadius(this.radius - 40);

    this.pie
      .append('text')
      .attr('transform', data => `translate(${this.labelArc.centroid(data)})`)
      .attr('dy', '0.35em')
      .text((_, index) =>
        formatter(
          this.graphDataMerged.pieChartOptions.labelFormat,
          this.graphDataMerged.labels[index],
          this.graphDataMerged.pieChartOptions.currency
        )
      );
  }

  eventsTooltip({ data, isToShow }: { data?: any; isToShow: boolean }): void {
    const toShow = () => {
      this.tooltipEl.show(
        `${formatter(
          this.graphDataMerged.pieChartOptions.dataFormat,
          data.data,
          this.graphDataMerged.pieChartOptions.currency
        )} <br/>
        ${formatter(
          this.graphDataMerged.pieChartOptions.labelFormat,
          this.graphDataMerged.labels[data.index],
          this.graphDataMerged.pieChartOptions.currency
        )}`,
        [event.pageX, event.pageY]
      );
    };

    const toHide = () => this.tooltipEl.hide();

    if (this.tooltipEl) {
      isToShow ? toShow() : toHide();
    }
  }

  eventsLegend(data: { label: any; index: number }) {
    const currentLabels: any = this.graphDataMerged.labels;
    const currentData: any = this.graphDataMerged.data[0];

    const tempLabels = currentLabels.filter(label => label !== data.label);
    const tempData = currentData.filter((_, index) => index !== data.index);

    if (currentLabels.length === tempLabels.length) {
      this.graphDataMerged.labels = this.graphData.labels;
      this.graphDataMerged.data = this.graphData.data;
      this.graphDataMerged.colors = this.graphData.colors;
      this.updateGraphData(this.graphDataMerged);
    } else {
      this.graphDataMerged.labels = tempLabels;
      this.graphDataMerged.data[0] = tempData;
      this.graphDataMerged.colors.splice(data.index, 1);
      this.updateGraphData(this.graphDataMerged);
    }
  }

  render(): JSX.Element {
    return (
      <div class="o-layout is--vertical">
        <div class="o-layout--chart">
          <svg style={this.graphDataMerged.styles} />
        </div>
        <div class="o-layout--slot">
          <slot name="tooltip" />
          <slot name="legend" />
        </div>
      </div>
    );
  }
}
