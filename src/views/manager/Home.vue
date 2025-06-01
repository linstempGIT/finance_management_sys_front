<template>
  <div>
    <div class="card" style="padding: 15px">
      您好，{{ user?.name || user?.username }}！欢迎使用本系统 <!-- Added fallback to username -->
    </div>

    <div style="display: flex; margin: 10px 0">
      <div style="width: 100%;" class="card">
        <div style="margin-bottom: 30px; font-size: 20px; font-weight: bold">公告列表</div>
        <div>
          <el-timeline reverse slot="reference">
            <el-timeline-item v-for="item in recentNotices" :key="item.id" :timestamp="item.time">
              <el-popover
                  placement="right"
                  width="200"
                  trigger="hover"
                  :content="item.content">
                <span slot="reference">{{ item.title }}</span>
              </el-popover>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </div>
    <!-- Modified v-if to include FINANCIAL role -->
    <div style="display: flex" v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL'">
      <div id="pie" style="height: 450px; flex: 1" class="card"></div>
      <div style="height: 450px; flex: 1;" class="card">
        <el-select v-model="month" style="width: 50%" @change="loadSalaryChartData(month)">
          <el-option v-for="item in monthData" :key="item.year" :label="item.year" :value="item.year"></el-option>
        </el-select>
        <div id="salaryBar" style="height: 400px; padding-top: 15px"></div>
      </div>
    </div>
    <!-- Modified v-if to include FINANCIAL role -->
    <div style="margin-top: 10px; display: flex" v-if="user.role === 'ADMIN' || user.role === 'FINANCIAL'">
      <div id="line" style="height: 400px; flex: 1" class="card"></div>
      <div id="bar" style="height: 400px; flex: 1" class="card"></div>
    </div>
  </div>
</template>

<script>
import * as echarts from "echarts";
import localNoticeData from '@/data/notice.json';

// Import new local JSON data
import salaryMonths from '@/data/salaryGetMonth.json';
import salariesByMonth from '@/data/salariesByMonth.json';
import financialPieData from '@/data/financialGetPie.json';
import financialLineData from '@/data/financialGetLine.json';
import financialBarData from '@/data/financialGetBar.json';

// ECharts options templates
let pieOptionsTemplate = {
  title: { text: '', subtext: '', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
  legend: { orient: 'vertical', left: 'left' },
  series: [ { name: '', type: 'pie', radius: '50%', center: ['50%', '60%'], data: [], avoidLabelOverlap: false, label: { show: false, position: 'center' }, emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } } } ] // Added label config
};
let lineOptionsTemplate = {
  title: { text: '', subtext: '', left: 'center' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  tooltip: { trigger: 'axis' },
  series: [ { data: [], type: 'line', smooth: true } ]
};
let barOptionsTemplate = {
  title: { text: '', subtext: '', left: 'center' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  tooltip: { trigger: 'axis' },
  series: [ { data: [], type: 'bar', itemStyle: { color:function(){return "#"+Math.floor(Math.random()*(256*256*256-1)).toString(16);} } } ]
};
let barSalaryOptionsTemplate = {
  title: { text: '', subtext: '', left: 'center' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  tooltip: { trigger: 'axis' },
  series: [ { data: [], type: 'bar', itemStyle: { color:function(){return "#"+Math.floor(Math.random()*(256*256*256-1)).toString(16);} } } ]
};


export default {
  name: 'Home',
  data() {
    return {
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      recentNotices: [],
      month: null,
      monthData: [],
      pieChartInstance: null,
      salaryBarInstance: null,
      lineChartInstance: null,
      barChartInstance: null,
    }
  },
  created() {
    this.loadRecentNotices();

    // Modified condition to include FINANCIAL role for month data loading
    if (this.user.role === 'ADMIN' || this.user.role === 'FINANCIAL') {
      this.monthData = salaryMonths;
      if (this.monthData && this.monthData.length > 0) {
        this.month = this.monthData[0].year; // Default to the first month
      } else {
        console.warn("No month data loaded for salary dropdown.");
      }
    }
  },
  mounted() {
    // Modified condition to include FINANCIAL role for chart initialization
    if (this.user.role === 'ADMIN' || this.user.role === 'FINANCIAL') {
      this.$nextTick(() => {
        console.log("DOM is ready, attempting to initialize charts for ADMIN/FINANCIAL.");
        this.initializeChartsForAuthorizedUsers();
      });
    }
  },
  methods: {
    loadRecentNotices() {
      if (localNoticeData && localNoticeData.length > 0) {
        const allNotices = [...localNoticeData];
        allNotices.sort((a, b) => new Date(b.time) - new Date(a.time));
        this.recentNotices = allNotices.slice(0, 3);
      } else {
        this.recentNotices = [];
      }
    },

    // Renamed for clarity
    initializeChartsForAuthorizedUsers() {
      if (this.month) { // Ensure month is set before loading salary chart
        this.loadSalaryChartData(this.month);
      } else if (this.monthData && this.monthData.length > 0) {
        // If month wasn't set but monthData is available, set it and load
        this.month = this.monthData[0].year;
        this.loadSalaryChartData(this.month);
      } else {
        console.warn("Initial month for salary chart is not set. Salary chart might not load initially.");
      }
      this.loadFinancialPieData();
      this.loadFinancialLineData();
      this.loadFinancialBarData();
    },

    loadSalaryChartData(month) {
      const dataForMonth = salariesByMonth[month] || salariesByMonth.default; // Use selected month or default
      const chartDom = document.getElementById('salaryBar');

      if (!chartDom) {
        console.error("DOM element #salaryBar not found for ECharts.");
        return;
      }
      
      try {
        if (!this.salaryBarInstance || this.salaryBarInstance.isDisposed?.()) {
          this.salaryBarInstance = echarts.init(chartDom);
        }

        if (dataForMonth && dataForMonth.xAxis && dataForMonth.yAxis) { // Ensure data structure is valid
          let options = JSON.parse(JSON.stringify(barSalaryOptionsTemplate));
          options.title.text = dataForMonth.text || `Salaries for ${month}`;
          options.title.subtext = dataForMonth.subtext || '';
          options.xAxis.data = dataForMonth.xAxis;
          options.series[0].data = dataForMonth.yAxis;
          this.salaryBarInstance.setOption(options, true);
        } else {
          this.$message.error(`No valid salary data found for ${month}`);
          if(this.salaryBarInstance) this.salaryBarInstance.clear();
        }
      } catch (e) {
        console.error("Error initializing/setting options for SalaryBar chart:", e);
        this.$message.error("Error loading salary chart.");
      }
    },

    loadFinancialPieData() {
      const data = financialPieData;
      const chartDom = document.getElementById('pie');
      if (!chartDom) {
        console.error("DOM element #pie not found for ECharts.");
        return;
      }
      
      try {
        if (!this.pieChartInstance || this.pieChartInstance.isDisposed?.()) {
          this.pieChartInstance = echarts.init(chartDom);
        }
        
        if (data && data.data) { // Ensure data structure is valid
          let options = JSON.parse(JSON.stringify(pieOptionsTemplate));
          options.title.text = data.text || 'Financial Overview';
          options.title.subtext = data.subtext || '';
          options.series[0].name = data.name || 'Category';
          options.series[0].data = data.data;
          this.pieChartInstance.setOption(options, true);
        } else {
          this.$message.error("Failed to load valid pie chart data.");
          if(this.pieChartInstance) this.pieChartInstance.clear();
        }
      } catch (e) {
        console.error("Error initializing/setting options for Pie chart:", e);
        this.$message.error("Error loading pie chart.");
      }
    },

    loadFinancialLineData() {
      const data = financialLineData;
      const chartDom = document.getElementById('line');
      if (!chartDom) {
        console.error("DOM element #line not found for ECharts.");
        return;
      }
      
      try {
        if (!this.lineChartInstance || this.lineChartInstance.isDisposed?.()) {
          this.lineChartInstance = echarts.init(chartDom);
        }
        
        if (data && data.xAxis && data.yAxis) { // Ensure data structure is valid
          let options = JSON.parse(JSON.stringify(lineOptionsTemplate));
          options.title.text = data.text || 'Financial Trend';
          options.title.subtext = data.subtext || '';
          options.xAxis.data = data.xAxis;
          options.series[0].data = data.yAxis;
          this.lineChartInstance.setOption(options, true);
        } else {
          this.$message.error("Failed to load valid line chart data.");
          if(this.lineChartInstance) this.lineChartInstance.clear();
        }
      } catch (e) {
        console.error("Error initializing/setting options for Line chart:", e);
        this.$message.error("Error loading line chart.");
      }
    },

    loadFinancialBarData() {
      const data = financialBarData;
      const chartDom = document.getElementById('bar');
      if (!chartDom) {
        console.error("DOM element #bar not found for ECharts.");
        return;
      }

      try {
        if (!this.barChartInstance || this.barChartInstance.isDisposed?.()) {
          this.barChartInstance = echarts.init(chartDom);
        }

        if (data && data.xAxis && data.yAxis) { // Ensure data structure is valid
          let options = JSON.parse(JSON.stringify(barOptionsTemplate));
          options.title.text = data.text || 'Financial Comparison';
          options.title.subtext = data.subtext || '';
          options.xAxis.data = data.xAxis;
          options.series[0].data = data.yAxis;
          this.barChartInstance.setOption(options, true);
        } else {
          this.$message.error("Failed to load valid bar chart data.");
          if(this.barChartInstance) this.barChartInstance.clear();
        }
      } catch (e) {
        console.error("Error initializing/setting options for Bar chart:", e);
        this.$message.error("Error loading bar chart.");
      }
    }
  },
  beforeDestroy() {
    if (this.user.role === 'ADMIN' || this.user.role === 'FINANCIAL') { // Dispose only if initialized
        if (this.pieChartInstance && !this.pieChartInstance.isDisposed?.()) this.pieChartInstance.dispose();
        if (this.salaryBarInstance && !this.salaryBarInstance.isDisposed?.()) this.salaryBarInstance.dispose();
        if (this.lineChartInstance && !this.lineChartInstance.isDisposed?.()) this.lineChartInstance.dispose();
        if (this.barChartInstance && !this.barChartInstance.isDisposed?.()) this.barChartInstance.dispose();
    }
  }
}
</script>
