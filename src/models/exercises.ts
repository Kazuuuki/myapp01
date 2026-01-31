export type BodyPartOption = {
  key: string;
  label: string;
  exercises: string[];
};

export const BODY_PARTS: BodyPartOption[] = [
  {
    key: 'chest',
    label: '胸',
    exercises: ['ベンチプレス', 'インクラインベンチ', 'ダンベルフライ', 'プッシュアップ'],
  },
  {
    key: 'back',
    label: '背中',
    exercises: ['デッドリフト', 'ラットプルダウン', 'ベントオーバーロウ', 'シーテッドロウ'],
  },
  {
    key: 'legs',
    label: '脚',
    exercises: ['スクワット', 'レッグプレス', 'レッグエクステンション', 'レッグカール'],
  },
  {
    key: 'shoulders',
    label: '肩',
    exercises: ['ショルダープレス', 'サイドレイズ', 'リアレイズ', 'アップライトロウ'],
  },
  {
    key: 'arms',
    label: '腕',
    exercises: ['アームカール', 'ハンマーカール', 'トライセプスプレス', 'ディップス'],
  },
  {
    key: 'core',
    label: '体幹',
    exercises: ['プランク', 'クランチ', 'レッグレイズ', 'ロシアンツイスト'],
  },
];
