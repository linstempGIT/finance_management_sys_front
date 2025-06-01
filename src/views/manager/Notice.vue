<template>
  <div>
    <div class="search">
      <el-input placeholder="请输入标题查询" style="width: 200px" v-model="titleSearch"></el-input>
      <el-button type="info" plain style="margin-left: 10px" @click="load(1)">查询</el-button>
      <el-button type="warning" plain style="margin-left: 10px" @click="reset">重置</el-button>
    </div>

    <div class="operation">
      <el-button type="primary" plain @click="handleAdd">新增</el-button>
      <el-button type="danger" plain @click="delBatch">批量删除</el-button>
    </div>

    <div class="table">
      <el-table :data="tableData" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center"></el-table-column>
        <el-table-column prop="id" label="序号" width="80" align="center" sortable></el-table-column>
        <el-table-column prop="title" label="标题" show-overflow-tooltip></el-table-column>
        <el-table-column prop="content" label="内容" show-overflow-tooltip></el-table-column>
        <el-table-column prop="time" label="创建时间"></el-table-column>
        <el-table-column prop="user" label="创建人"></el-table-column>

        <el-table-column label="操作" width="180" align="center">
          <template v-slot="scope">
            <el-button plain type="primary" @click="handleEdit(scope.row)" size="mini">编辑</el-button>
            <el-button plain type="danger" size="mini" @click="del(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
            background
            @current-change="handleCurrentChange"
            :current-page="pageNum"
            :page-sizes="[5, 10, 20]"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="total">
        </el-pagination>
      </div>
    </div>

    <el-dialog title="公告信息" :visible.sync="fromVisible" width="40%" :close-on-click-modal="false" destroy-on-close>
      <el-form label-width="100px" style="padding-right: 50px" :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="title" label="标题">
          <el-input v-model="form.title" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item prop="content" label="内容">
          <el-input type="textarea" :rows="5" v-model="form.content" autocomplete="off"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="fromVisible = false">取 消</el-button>
        <el-button type="primary" @click="save">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import allNoticesDataFromFile from '@/data/notice.json'; // Import the local JSON

const LOCAL_STORAGE_KEY_NOTICES = 'vue_local_notices_data';

export default {
  name: "Notice",
  data() {
    return {
      localNotices: [], // This will be our source of truth, synced with localStorage
      tableData: [],  // Data for the current page
      pageNum: 1,
      pageSize: 10,
      total: 0,
      titleSearch: null,
      fromVisible: false,
      form: {},
      user: JSON.parse(localStorage.getItem('xm-user') || '{}'),
      rules: {
        title: [
          {required: true, message: '请输入标题', trigger: 'blur'},
        ],
        content: [
          {required: true, message: '请输入内容', trigger: 'blur'},
        ]
      },
      ids: []
    }
  },
  created() {
    this.loadNoticesFromStorageOrFile();
    this.load(1);
  },
  methods: {
    _saveNoticesToLocalStorage() {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_NOTICES, JSON.stringify(this.localNotices));
      } catch (e) {
        console.error("Error saving notices to localStorage:", e);
        this.$message.error('保存数据到本地存储失败!');
      }
    },
    loadNoticesFromStorageOrFile() {
      const storedNotices = localStorage.getItem(LOCAL_STORAGE_KEY_NOTICES);
      if (storedNotices) {
        try {
          this.localNotices = JSON.parse(storedNotices);
        } catch (e) {
          console.error("Error parsing notices from localStorage:", e);
          this.$message.error('本地存储的公告数据格式错误，将使用默认数据。');
          this.localNotices = JSON.parse(JSON.stringify(allNoticesDataFromFile)); // Fallback
          this._saveNoticesToLocalStorage(); // Try to save the fallback
        }
      } else {
        // Deep clone the imported data to avoid modifying the original import
        this.localNotices = JSON.parse(JSON.stringify(allNoticesDataFromFile));
        this._saveNoticesToLocalStorage(); // Save initial data to localStorage
      }
    },
    handleAdd() {
      this.form = {};
      this.fromVisible = true;
    },
    handleEdit(row) {
      this.form = JSON.parse(JSON.stringify(row));
      this.fromVisible = true;
    },
    save() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          if (this.form.id) { // Update existing notice
            const index = this.localNotices.findIndex(item => item.id === this.form.id);
            if (index !== -1) {
              this.form.time = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
              // this.form.user = this.user.name; // Uncomment if user should be updated on edit
              this.localNotices.splice(index, 1, { ...this.localNotices[index], ...this.form });
              this.$message.success('更新成功');
            } else {
              this.$message.error('未找到要更新的公告');
              this.fromVisible = false;
              return;
            }
          } else { // Add new notice
            const newId = this.localNotices.length > 0 ? Math.max(...this.localNotices.map(n => n.id)) + 1 : 1;
            const newNotice = {
              ...this.form,
              id: newId,
              time: new Date().toLocaleDateString('sv'), // YYYY-MM-DD
              user: this.user.name || '未知用户'
            };
            this.localNotices.push(newNotice);
            this.$message.success('新增成功');
          }
          this._saveNoticesToLocalStorage(); // Persist changes
          this.load(this.form.id ? this.pageNum : 1);
          this.fromVisible = false;
        } else {
            console.log('error submit!!');
            return false;
        }
      });
    },
    del(id) {
      this.$confirm('您确定删除吗？', '确认删除', {type: "warning"}).then(() => {
        const initialLength = this.localNotices.length;
        this.localNotices = this.localNotices.filter(item => item.id !== id);
        if (this.localNotices.length < initialLength) {
          this.$message.success('删除成功');
          this._saveNoticesToLocalStorage(); // Persist changes
          const totalPages = Math.ceil(this.localNotices.length / this.pageSize);
          if (this.pageNum > totalPages && totalPages > 0) {
            this.pageNum = totalPages;
          }
          this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
          this.$message.error('未找到要删除的公告');
        }
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },
    handleSelectionChange(rows) {
      this.ids = rows.map(v => v.id);
    },
    delBatch() {
      if (!this.ids.length) {
        this.$message.warning('请选择数据');
        return;
      }
      this.$confirm('您确定批量删除这些数据吗？', '确认删除', {type: "warning"}).then(() => {
        const initialLength = this.localNotices.length;
        this.localNotices = this.localNotices.filter(item => !this.ids.includes(item.id));
        if (this.localNotices.length < initialLength) {
            this.$message.success('批量删除成功');
            this.ids = [];
            this._saveNoticesToLocalStorage(); // Persist changes
            const totalPages = Math.ceil(this.localNotices.length / this.pageSize);
             if (this.pageNum > totalPages && totalPages > 0) {
                this.pageNum = totalPages;
            }
            this.load(this.pageNum > 0 ? this.pageNum : 1);
        } else {
            this.$message.error('未删除任何公告，请检查选择');
        }
      }).catch(() => {
        this.$message.info('已取消批量删除');
      });
    },
    load(pageNum) {
      if (pageNum) this.pageNum = pageNum;
      let filteredData = [...this.localNotices];
      if (this.titleSearch && this.titleSearch.trim() !== '') {
        filteredData = filteredData.filter(item =>
          item.title && item.title.toLowerCase().includes(this.titleSearch.toLowerCase())
        );
      }
      this.total = filteredData.length;
      const start = (this.pageNum - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.tableData = filteredData.slice(start, end);
    },
    reset() {
      this.titleSearch = null;
      this.load(1);
    },
    handleCurrentChange(pageNum) {
      this.load(pageNum);
    },
  }
}
</script>

<style scoped>
.search, .operation, .table, .pagination {
  margin-bottom: 15px;
}
</style>
