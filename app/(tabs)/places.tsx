import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSpotClip } from '../../src/services/AppProvider.tsx';
import { categories, type Category, type Place } from '../../src/domain/types.ts';
import { Button, Icon, Notice, sharedStyles } from '../../src/components/ui.tsx';
import { colors } from '../../src/components/theme.ts';
import PlaceCard from '../../src/components/PlaceCard.tsx';

export default function PlacesScreen() {
  const app = useSpotClip(); const router = useRouter();
  const [filter, setFilter] = useState<'전체' | Category>('전체'); const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Place | null>(null); const [deleting, setDeleting] = useState(false);
  const filtered = app.places.filter(p => (filter === '전체' || p.category === filter) && `${p.name} ${p.address} ${p.note}`.toLowerCase().includes(query.toLowerCase()));
  return <SafeAreaView edges={['top']} style={sharedStyles.screen}>
    <FlatList data={filtered} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={[sharedStyles.scroll, { gap: 0, flexGrow: 1 }]} renderItem={({ item }) => <PlaceCard place={item} onEdit={() => { setEditing({ ...item }); setDeleting(false); }} />}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.top}><View><Text accessibilityRole="header" style={sharedStyles.h1}>내 장소</Text><Text style={styles.total}>작은 발견, 총 {app.places.length}곳</Text></View><View style={styles.bookmark}><Icon name="bookmark-outline" size={28} /></View></View>
        {app.error && <Notice error>{app.error}</Notice>}{app.notice && <Notice>{app.notice}</Notice>}
        <View style={styles.search}><Icon name="search-outline" size={19} color={colors.muted} /><TextInput accessibilityLabel="저장한 장소 검색" placeholder="장소, 지역, 메모 검색" placeholderTextColor="#8B9784" value={query} onChangeText={setQuery} style={styles.searchInput} clearButtonMode="while-editing" /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(['전체', ...categories] as const).map(category => <Pressable accessibilityRole="button" accessibilityLabel={`${category} 필터`} accessibilityState={{ selected: filter === category }} onPress={() => setFilter(category)} style={[styles.filter, filter === category && styles.filterSelected]} key={category}><Text style={[styles.filterText, filter === category && { color: colors.green, fontWeight: '600' }]}>{category}</Text></Pressable>)}</ScrollView>
      </View>}
      ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Icon name="bookmark-outline" size={31} /></View><Text style={styles.emptyTitle}>{app.places.length ? '찾는 장소가 없어요' : '첫 번째 발견을 담아보세요'}</Text><Text style={styles.emptyText}>{app.places.length ? '다른 검색어나 분류로 찾아보세요.' : 'SNS에서 만난 그곳,\n사진 한 장으로 기억해둘 수 있어요.'}</Text>{!app.places.length && <Button label="사진으로 장소 담기" onPress={() => router.navigate('/')} secondary icon="add" style={{ marginTop: 18 }} />}</View>}
      ListFooterComponent={app.places.length ? <Text style={styles.footer}>{Platform.OS === 'web' ? '장소는 이 브라우저에 보관돼요.\n브라우저 데이터를 삭제하면 목록도 사라질 수 있어요.' : '장소는 이 기기에 보관돼요.\n앱을 삭제하면 저장 목록도 사라질 수 있어요.'}</Text> : null}
    />
    <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}><SafeAreaView style={sharedStyles.screen}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={sharedStyles.scroll}>
      <View style={styles.editHeader}><Text style={sharedStyles.h2}>{deleting ? '이 장소를 삭제할까요?' : '내 장소 수정'}</Text><Pressable accessibilityRole="button" accessibilityLabel="수정 닫기" onPress={() => setEditing(null)} style={styles.close}><Icon name="close" /></Pressable></View>
      {editing && <><Text style={styles.editName}>{editing.name}</Text><Text style={sharedStyles.body}>{editing.address}</Text>{app.error && <Notice error>{app.error}</Notice>}
        {deleting ? <><Text style={sharedStyles.body}>SpotClip 목록에서 삭제해요. 네이버·카카오 지도에 별도로 저장한 즐겨찾기에는 영향을 주지 않아요.</Text><Button label="장소 삭제" disabled={!!app.busy} style={{ backgroundColor: colors.red }} onPress={() => void (async () => { if (await app.remove(editing.id)) setEditing(null); })()} /><Button label="취소" secondary onPress={() => setDeleting(false)} /></> : <>
          <View><Text style={sharedStyles.label}>나만의 메모</Text><TextInput accessibilityLabel="나만의 메모" placeholder="가보고 싶은 이유를 남겨보세요" placeholderTextColor="#9BA593" value={editing.note} onChangeText={note => setEditing({ ...editing, note })} maxLength={1000} multiline style={[sharedStyles.field, { minHeight: 110, textAlignVertical: 'top' }]} /></View>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>다녀온 곳</Text><Switch accessibilityLabel="다녀온 곳" value={editing.visited} onValueChange={visited => setEditing({ ...editing, visited })} trackColor={{ true: colors.green, false: '#DCE4D7' }} /></View>
          <Button label="변경 저장" disabled={!!app.busy} onPress={() => void (async () => { if (await app.update(editing)) setEditing(null); })()} />
          <Button label="이 장소 삭제" secondary icon="trash-outline" disabled={!!app.busy} onPress={() => setDeleting(true)} />
        </>}
      </>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  header: { gap: 18, paddingBottom: 18 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }, total: { color: colors.muted, fontSize: 13, marginTop: 7 }, bookmark: { backgroundColor: colors.greenLight, borderRadius: 20, width: 58, height: 62, justifyContent: 'center', alignItems: 'center' },
  search: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }, searchInput: { flex: 1, fontSize: 16, paddingVertical: 15, color: colors.ink }, filters: { gap: 7 }, filter: { borderRadius: 20, paddingHorizontal: 15, minHeight: 42, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }, filterSelected: { backgroundColor: colors.greenLight, borderColor: '#D6E3CD' }, filterText: { fontSize: 13, color: colors.muted },
  empty: { alignItems: 'center', padding: 34, paddingHorizontal: 16, backgroundColor: '#FFFFFF80', borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginTop: 3 }, emptyIcon: { borderRadius: 26, width: 64, height: 64, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.greenLight, marginBottom: 19 }, emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '600' }, emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 23, marginTop: 10 }, footer: { color: colors.muted, fontSize: 11, lineHeight: 20, textAlign: 'center', paddingVertical: 20 }, editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, close: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, editName: { color: colors.ink, fontSize: 21, lineHeight: 31, fontWeight: '700' }, switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, switchLabel: { fontSize: 16, color: colors.ink },
});
