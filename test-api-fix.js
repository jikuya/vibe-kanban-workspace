#!/usr/bin/env node
// test-api-fix.js
// Vibe Kanban API修正版のテストスクリプト

require('dotenv').config();
const axios = require('axios');

const VIBE_PORT = process.env.VIBE_PORT || 7842;
const BRIDGE_PORT = process.env.BRIDGE_PORT || 7843;
const DEFAULT_PROJECT_ID = process.env.VIBE_PROJECT_ID || 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';

console.log('🧪 Vibe Kanban API修正版テスト開始');
console.log(`プロジェクトID: ${DEFAULT_PROJECT_ID}`);
console.log(`Vibe Kanbanポート: ${VIBE_PORT}`);
console.log(`Bridgeポート: ${BRIDGE_PORT}`);
console.log('================================');

async function testDirectAPI() {
  console.log('\n📋 1. 直接API接続テスト');
  
  try {
    // 1. プロジェクトIDを含めてタスクリストを取得
    console.log(`GET http://localhost:${VIBE_PORT}/api/tasks?project_id=${DEFAULT_PROJECT_ID}`);
    const response = await axios.get(`http://localhost:${VIBE_PORT}/api/tasks?project_id=${DEFAULT_PROJECT_ID}`);
    console.log('✅ タスクリスト取得成功');
    console.log(`タスク数: ${response.data.length}`);
    
    return true;
  } catch (error) {
    console.log('❌ 直接API接続失敗:', error.message);
    if (error.response) {
      console.log(`ステータス: ${error.response.status}`);
      console.log(`エラー詳細: ${error.response.data}`);
    }
    return false;
  }
}

async function testBridgeAPI() {
  console.log('\n🌉 2. Bridge API接続テスト');
  
  try {
    // 1. Bridge経由でタスクリストを取得
    console.log(`GET http://localhost:${BRIDGE_PORT}/claude/tasks`);
    const response = await axios.get(`http://localhost:${BRIDGE_PORT}/claude/tasks`);
    console.log('✅ Bridge経由タスクリスト取得成功');
    console.log(`タスク数: ${response.data.length}`);
    
    return true;
  } catch (error) {
    console.log('❌ Bridge API接続失敗:', error.message);
    if (error.response) {
      console.log(`ステータス: ${error.response.status}`);
      console.log(`エラー詳細: ${error.response.data}`);
    }
    return false;
  }
}

async function testTaskCreation() {
  console.log('\n📝 3. タスク作成テスト');
  
  const testTask = {
    title: 'API修正テスト',
    description: 'project_id対応の動作確認',
    priority: 'high',
    project_id: DEFAULT_PROJECT_ID
  };
  
  try {
    console.log('POST http://localhost:' + BRIDGE_PORT + '/claude/create-task');
    const response = await axios.post(`http://localhost:${BRIDGE_PORT}/claude/create-task`, testTask);
    console.log('✅ Bridge経由タスク作成成功');
    console.log(`作成されたタスク: ${JSON.stringify(response.data, null, 2)}`);
    
    return response.data.task?.id;
  } catch (error) {
    console.log('❌ Bridge経由タスク作成失敗:', error.message);
    if (error.response) {
      console.log(`ステータス: ${error.response.status}`);
      console.log(`エラー詳細: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

async function testServerStatus() {
  console.log('\n⚙️ サーバー状況確認');
  
  const servers = [
    { name: 'Vibe Kanban', url: `http://localhost:${VIBE_PORT}` },
    { name: 'Bridge', url: `http://localhost:${BRIDGE_PORT}` }
  ];
  
  for (const server of servers) {
    try {
      await axios.get(server.url, { timeout: 3000 });
      console.log(`✅ ${server.name}: 稼働中 (${server.url})`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${server.name}: 停止中 (${server.url})`);
      } else {
        console.log(`⚠️ ${server.name}: アクセス可能 (${server.url})`);
      }
    }
  }
}

async function runTests() {
  try {
    await testServerStatus();
    
    const directResult = await testDirectAPI();
    const bridgeResult = await testBridgeAPI();
    
    if (directResult && bridgeResult) {
      const taskId = await testTaskCreation();
      
      if (taskId) {
        console.log('\n🎉 全テスト成功！');
        console.log('修正が正常に動作しています。');
      } else {
        console.log('\n⚠️ タスク作成に失敗しましたが、基本的な接続は動作しています。');
      }
    } else {
      console.log('\n❌ 基本的なAPI接続に問題があります。');
      console.log('サーバーの再起動が必要かもしれません。');
    }
    
  } catch (error) {
    console.log('\n💥 テスト実行中にエラーが発生しました:', error.message);
  }
  
  console.log('\n🏁 テスト完了');
}

// テスト実行
runTests();