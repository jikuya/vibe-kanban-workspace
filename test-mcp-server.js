// MCP Serverテスト - 修正後の動作確認

const axios = require('axios');

const VIBE_KANBAN_API = 'http://localhost:7842/api';
const DEFAULT_PROJECT_ID = 'a2695f64-0f53-43ce-a90b-e7897a59fbbc';

async function testCreateTask() {
    console.log('🧪 タスク作成テスト中...');
    
    try {
        const response = await axios.post(`${VIBE_KANBAN_API}/tasks`, {
            title: 'RVF App - ログアウト後再利用不可バグ',
            description: `プロジェクト: rvf-app
問題: ユーザーが新規登録後、ログアウトすると再度アプリケーションが使用できなくなる
優先度: 高
調査必要項目:
1. セッション管理の実装
2. 認証トークンの処理ロジック  
3. ログアウト処理での適切なクリーンアップ
4. 新規登録ユーザーの初期設定プロセス`,
            priority: 'high',
            status: 'todo',
            project_id: DEFAULT_PROJECT_ID,
            agent: 'claude-desktop',
            created_at: new Date().toISOString(),
        });

        console.log('✅ API Response:', response.data);
        
        // レスポンス構造の確認
        const taskId = response.data.data.id;
        const taskData = response.data.data;
        
        console.log('📋 Task ID:', taskId);
        console.log('📋 Task Data:', JSON.stringify(taskData, null, 2));
        
        return taskId;
    } catch (error) {
        console.error('❌ Task creation failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}

async function testListTasks() {
    console.log('🧪 タスク一覧テスト中...');
    
    try {
        const response = await axios.get(`${VIBE_KANBAN_API}/tasks?project_id=${DEFAULT_PROJECT_ID}`);
        
        console.log('✅ API Response structure:', {
            success: response.data.success,
            dataType: Array.isArray(response.data.data) ? 'array' : typeof response.data.data,
            dataLength: response.data.data?.length || 0
        });
        
        const tasks = response.data.data;
        
        console.log('📋 Total tasks:', tasks.length);
        tasks.forEach((task, index) => {
            console.log(`   ${index + 1}. #${task.id} [${task.status}] ${task.title}`);
        });
        
        return tasks;
    } catch (error) {
        console.error('❌ Task listing failed:', error.message);
        return null;
    }
}

async function runTests() {
    console.log('🚀 MCP Server API テスト開始\n');
    
    // タスク一覧テスト
    await testListTasks();
    console.log();
    
    // タスク作成テスト
    const taskId = await testCreateTask();
    
    if (taskId) {
        console.log('\n✅ 全てのテストが正常に完了しました！');
        console.log(`📋 作成されたタスクID: ${taskId}`);
    } else {
        console.log('\n❌ タスク作成テストが失敗しました');
    }
}

runTests().catch(console.error);