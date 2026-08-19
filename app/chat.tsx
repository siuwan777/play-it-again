import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  canConfirmMeetup,
  canConfirmSale,
  canExpressBuyInterest,
  canProposeMeetup,
  confirmMeetup,
  confirmSaleToBuyer,
  expressBuyInterest,
  formatMessageTime,
  getDealStatusLabel,
  getMeetupStatusLabel,
  getOtherPartyId,
  getOtherPartyName,
  hasRecentBuyIntent,
  markConversationRead,
  proposeMeetup,
  sendMessage,
  subscribeConversation,
  subscribeMessages,
  type ChatMessage,
  type Conversation,
} from '../utils/chat';
import { getChatQuickReplies } from '../utils/chatTemplates';
import { getExistingRating } from '../utils/transactionRating';
import { useBlockedUserIds } from '../hooks/useBlockedUserIds';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=800&auto=format&fit=crop';

const MEETUP_TIME_OPTIONS = ['今天下午', '明天下午', '週末'];
const MEETUP_PLACE_OPTIONS = ['旺角', '銅鑼灣', '深水埗'];

export default function Chat() {
  const router = useRouter();
  const navigation = useNavigation();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const scrollViewRef = useRef<ScrollView>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [expressingInterest, setExpressingInterest] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showMeetupModal, setShowMeetupModal] = useState(false);
  const [meetupTime, setMeetupTime] = useState(MEETUP_TIME_OPTIONS[0]);
  const [meetupPlace, setMeetupPlace] = useState(MEETUP_PLACE_OPTIONS[0]);
  const [meetupTimeCustom, setMeetupTimeCustom] = useState('');
  const [meetupPlaceCustom, setMeetupPlaceCustom] = useState('');
  const [proposingMeetup, setProposingMeetup] = useState(false);
  const [confirmingMeetup, setConfirmingMeetup] = useState(false);
  const { blockedUserIds } = useBlockedUserIds();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) {
      if (!conversationId) setLoading(false);
      return;
    }

    setLoading(true);
    let loadedConversation = false;
    let loadedMessages = false;

    const markLoaded = () => {
      if (loadedConversation && loadedMessages) {
        setLoading(false);
      }
    };

    const unsubscribeConversation = subscribeConversation(
      conversationId,
      (data) => {
        if (!data || !data.participants.includes(userId)) {
          setConversation(null);
          setLoading(false);
          return;
        }
        setConversation(data);
        loadedConversation = true;
        markLoaded();
      },
      (error) => {
        console.error('Failed to load conversation:', error);
        setLoading(false);
      }
    );

    const unsubscribeMessages = subscribeMessages(
      conversationId,
      (items) => {
        setMessages(items);
        loadedMessages = true;
        markLoaded();
      },
      (error) => {
        console.error('Failed to load messages:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeConversation();
      unsubscribeMessages();
    };
  }, [conversationId, userId]);

  useLayoutEffect(() => {
    if (!conversation || !userId) {
      navigation.setOptions({ title: '對話', headerRight: undefined });
      return;
    }

    const otherPartyName = getOtherPartyName(conversation, userId);
    const otherUserId = getOtherPartyId(conversation, userId);

    navigation.setOptions({
      title: `與 ${otherPartyName} 對話`,
      headerRight: otherUserId
        ? () => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/report',
                  params: {
                    userId: otherUserId,
                    userName: otherPartyName,
                    listingId: conversation.listingId,
                    conversationId: conversation.id,
                  },
                })
              }
              style={{ paddingHorizontal: 12 }}
            >
              <Text style={{ fontSize: 18 }}>🚨</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [conversation, userId, navigation, router]);

  useEffect(() => {
    if (!conversationId || !userId || loading || !conversation) return;

    markConversationRead(conversationId, userId).catch((error) => {
      console.error('Failed to mark conversation read:', error);
    });
  }, [conversationId, userId, loading, conversation, messages.length]);

  useEffect(() => {
    if (!conversation || !userId || conversation.dealStatus !== 'sold') {
      setHasRated(false);
      return;
    }

    getExistingRating(conversation.listingId, userId)
      .then((existing) => setHasRated(!!existing))
      .catch((error) => {
        console.error('Failed to check existing rating:', error);
        setHasRated(false);
      });
  }, [conversation?.listingId, conversation?.dealStatus, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!conversation || !userId || conversation.dealStatus !== 'sold') return;

      getExistingRating(conversation.listingId, userId)
        .then((existing) => setHasRated(!!existing))
        .catch((error) => console.error('Failed to check existing rating:', error));
    }, [conversation, userId])
  );

  const handleSend = async () => {
    if (!conversationId || !userId || !inputText.trim() || sending) return;

    setSending(true);
    const text = inputText.trim();
    setInputText('');

    try {
      await sendMessage(conversationId, userId, text);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(text);
      const message =
        error instanceof Error && error.message.includes('無法與此用戶傳送訊息')
          ? '你已封鎖此用戶，或對方已封鎖你，無法傳送訊息。'
          : '訊息無法送出，請稍後再試。';
      Alert.alert('傳送失敗', message);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  const handleProposeMeetup = async () => {
    if (!conversationId || !userId || proposingMeetup) return;

    const time = meetupTimeCustom.trim() || meetupTime;
    const place = meetupPlaceCustom.trim() || meetupPlace;

    if (!time || !place) {
      Alert.alert('請填寫交收資訊', '請選擇或輸入時間與地點。');
      return;
    }

    setProposingMeetup(true);
    try {
      await proposeMeetup(conversationId, userId, {
        method: '面交',
        time,
        place,
      });
      setShowMeetupModal(false);
      setMeetupTimeCustom('');
      setMeetupPlaceCustom('');
      Alert.alert('已送出', '交收提議已發送，等待對方確認。');
    } catch (error: any) {
      Alert.alert('無法送出', error.message || '請稍後再試。');
    } finally {
      setProposingMeetup(false);
    }
  };

  const handleConfirmMeetup = () => {
    if (!conversationId || !userId || confirmingMeetup) return;

    Alert.alert('確認交收安排', '確定同意這個交收時間與地點嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確認',
        onPress: async () => {
          setConfirmingMeetup(true);
          try {
            await confirmMeetup(conversationId, userId);
            Alert.alert('已確認', '交收安排已確認，祝交收順利！');
          } catch (error: any) {
            Alert.alert('無法確認', error.message || '請稍後再試。');
          } finally {
            setConfirmingMeetup(false);
          }
        },
      },
    ]);
  };

  const handleBuyIntent = async () => {
    if (!conversationId || !userId || !conversation || expressingInterest) return;

    setExpressingInterest(true);
    try {
      await expressBuyInterest(conversationId, userId);
      Alert.alert('已送出', '賣家已收到你的購買意願，請耐心等候回覆。');
    } catch (error: any) {
      Alert.alert('無法送出', error.message || '請稍後再試。');
    } finally {
      setExpressingInterest(false);
    }
  };

  const handleConfirmSale = () => {
    if (!conversationId || !userId || !conversation || confirmingSale) return;

    Alert.alert(
      '確認售予此買家',
      `確定將「${conversation.listingTitle}」售予 ${conversation.buyerName} 嗎？\n\n商品將從市集下架，買家會收到評價通知。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認售出',
          onPress: async () => {
            setConfirmingSale(true);
            try {
              await confirmSaleToBuyer(conversationId, userId);
              Alert.alert('交易已確認', '商品已下架，買家已收到通知。', [
                { text: '稍後再評', style: 'cancel' },
                {
                  text: '為買家評分',
                  onPress: () =>
                    router.push({
                      pathname: '/rate',
                      params: {
                        listingId: conversation.listingId,
                        listingTitle: conversation.listingTitle,
                        revieweeId: conversation.buyerId,
                        revieweeName: conversation.buyerName,
                      },
                    }),
                },
              ]);
            } catch (error: any) {
              Alert.alert('無法確認', error.message || '請稍後再試。');
            } finally {
              setConfirmingSale(false);
            }
          },
        },
      ]
    );
  };

  if (!conversationId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>找不到對話</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>請先登入</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/login')}>
          <Text style={styles.backBtnText}>前往登入</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>載入對話中...</Text>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>無法讀取此對話</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const otherPartyName = getOtherPartyName(conversation, userId);
  const otherUserId = getOtherPartyId(conversation, userId);
  const isBlocked = otherUserId ? blockedUserIds.has(otherUserId) : false;
  const isBuyer = userId === conversation.buyerId;
  const isSold = conversation.dealStatus === 'sold';
  const showBuyButton = isBuyer && canExpressBuyInterest(conversation, userId);
  const showConfirmSaleButton = !isBuyer && canConfirmSale(conversation, userId);
  const buyIntentSent = isBuyer && hasRecentBuyIntent(conversation);
  const quickReplies = getChatQuickReplies(isBuyer);
  const showRateButton = isSold && !hasRated;
  const rateRevieweeId = isBuyer ? conversation.sellerId : conversation.buyerId;
  const rateRevieweeName = isBuyer ? conversation.sellerName : conversation.buyerName;
  const rateButtonLabel = isBuyer ? '⭐ 為賣家評分' : '⭐ 為買家評分';
  const meetupStatusLabel = getMeetupStatusLabel(conversation, userId);
  const showProposeMeetupButton = canProposeMeetup(conversation, userId);
  const showConfirmMeetupButton = canConfirmMeetup(conversation, userId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.itemHeader}>
        <Image
          source={{ uri: conversation.listingImage || DEFAULT_IMAGE }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {conversation.listingTitle}
          </Text>
          <Text style={styles.itemPrice}>HK$ {conversation.listingPrice}</Text>
        </View>
      </View>

      <View
        style={[
          styles.statusBar,
          conversation.dealStatus === 'buyer_interested' && styles.statusBarActive,
          isSold && styles.statusBarSold,
        ]}
      >
        <Text style={[styles.statusText, isSold && styles.statusTextSold]}>
          {getDealStatusLabel(conversation.dealStatus, isBuyer)}
        </Text>
        {meetupStatusLabel ? (
          <Text style={[styles.meetupStatusText, isSold && styles.statusTextSold]}>
            {meetupStatusLabel}
          </Text>
        ) : null}
      </View>

      {isBlocked && (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>
            你已封鎖此用戶，或對方已封鎖你，無法繼續傳送訊息。
          </Text>
        </View>
      )}

      {!isSold && !isBlocked && (showProposeMeetupButton || showConfirmMeetupButton) && (
        <View style={styles.meetupActionRow}>
          {showProposeMeetupButton && (
            <TouchableOpacity
              style={[styles.meetupActionBtn, styles.meetupProposeBtn]}
              onPress={() => setShowMeetupModal(true)}
            >
              <Text style={styles.meetupActionBtnText}>📍 提議交收</Text>
            </TouchableOpacity>
          )}
          {showConfirmMeetupButton && (
            <TouchableOpacity
              style={[
                styles.meetupActionBtn,
                styles.meetupConfirmBtn,
                confirmingMeetup && styles.meetupActionBtnDisabled,
              ]}
              onPress={handleConfirmMeetup}
              disabled={confirmingMeetup}
            >
              {confirmingMeetup ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.meetupActionBtnText}>✅ 確認交收安排</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {showConfirmSaleButton && !isBlocked && (
        <TouchableOpacity
          style={[styles.confirmSaleBtn, confirmingSale && styles.confirmSaleBtnDisabled]}
          onPress={handleConfirmSale}
          disabled={confirmingSale}
        >
          {confirmingSale ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmSaleBtnText}>🤝 確認售予此買家</Text>
          )}
        </TouchableOpacity>
      )}

      {showRateButton && (
        <TouchableOpacity
          style={styles.rateActionBtn}
          onPress={() =>
            router.push({
              pathname: '/rate',
              params: {
                listingId: conversation.listingId,
                listingTitle: conversation.listingTitle,
                revieweeId: rateRevieweeId,
                revieweeName: rateRevieweeName,
              },
            })
          }
        >
          <Text style={styles.rateActionBtnText}>{rateButtonLabel}</Text>
        </TouchableOpacity>
      )}

      {isSold && hasRated && (
        <View style={styles.ratedBanner}>
          <Text style={styles.ratedBannerText}>✅ 你已為這次交易評分</Text>
        </View>
      )}

      {showBuyButton && !isBlocked && (
        <TouchableOpacity
          style={[styles.buyIntentBtn, expressingInterest && styles.buyIntentBtnDisabled]}
          onPress={handleBuyIntent}
          disabled={expressingInterest}
        >
          {expressingInterest ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buyIntentBtnText}>✅ 我想買這件商品</Text>
          )}
        </TouchableOpacity>
      )}

      {buyIntentSent && !showBuyButton && (
        <View style={styles.buyIntentSentBanner}>
          <Text style={styles.buyIntentSentText}>你已表示購買意願，等待賣家回覆中</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>開始跟 {otherPartyName} 聊聊這件商品吧</Text>
            {isBuyer && (
              <Text style={styles.emptyChatHint}>確定想買？按上方「我想買」讓賣家知道</Text>
            )}
          </View>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'buy_intent' || msg.type === 'system') {
              const systemIcon = msg.text.includes('交收') ? '📍' : '✅';
              return (
                <View key={msg.id} style={styles.systemCard}>
                  <Text style={styles.systemCardIcon}>{systemIcon}</Text>
                  <Text style={styles.systemCardText}>{msg.text}</Text>
                  <Text style={styles.systemCardTime}>{formatMessageTime(msg.createdAt)}</Text>
                </View>
              );
            }

            const isMe = msg.senderId === userId;
            return (
              <View
                key={msg.id}
                style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperSeller]}
              >
                {!isMe && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{otherPartyName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleSeller]}>
                  <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextSeller]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeSeller]}>
                    {formatMessageTime(msg.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {!isBlocked && (
        <View style={styles.quickReplySection}>
          <Text style={styles.quickReplyLabel}>快速回覆</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplyRow}
          >
            {quickReplies.map((reply) => (
              <TouchableOpacity
                key={reply.label}
                style={styles.quickReplyChip}
                onPress={() => handleQuickReply(reply.text)}
              >
                <Text style={styles.quickReplyChipText}>{reply.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!isBlocked ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="輸入訊息..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Text style={[styles.sendButtonText, (!inputText.trim() || sending) && styles.sendButtonTextDisabled]}>
              {sending ? '...' : '傳送'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={showMeetupModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>提議交收</Text>
            <Text style={styles.modalSub}>選好時間與地點，對方確認後即可安排面交。</Text>

            <Text style={styles.modalLabel}>時間</Text>
            <View style={styles.modalChipRow}>
              {MEETUP_TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalChip,
                    meetupTime === option && !meetupTimeCustom.trim() && styles.modalChipActive,
                  ]}
                  onPress={() => {
                    setMeetupTime(option);
                    setMeetupTimeCustom('');
                  }}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      meetupTime === option && !meetupTimeCustom.trim() && styles.modalChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="或自訂時間（例如：週六下午 3 點）"
              value={meetupTimeCustom}
              onChangeText={setMeetupTimeCustom}
            />

            <Text style={styles.modalLabel}>地點</Text>
            <View style={styles.modalChipRow}>
              {MEETUP_PLACE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalChip,
                    meetupPlace === option && !meetupPlaceCustom.trim() && styles.modalChipActive,
                  ]}
                  onPress={() => {
                    setMeetupPlace(option);
                    setMeetupPlaceCustom('');
                  }}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      meetupPlace === option && !meetupPlaceCustom.trim() && styles.modalChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="或自訂地點（例如：旺角 MOKO 正門）"
              value={meetupPlaceCustom}
              onChangeText={setMeetupPlaceCustom}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowMeetupModal(false)}
                disabled={proposingMeetup}
              >
                <Text style={styles.modalCancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, proposingMeetup && styles.modalSubmitBtnDisabled]}
                onPress={handleProposeMeetup}
                disabled={proposingMeetup}
              >
                {proposingMeetup ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>送出提議</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8A7B72' },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 20 },
  backBtn: { backgroundColor: '#C35A2C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  itemImage: { width: 40, height: 40, borderRadius: 8, marginRight: 10, backgroundColor: '#F3F4F6' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#111111' },
  itemPrice: { fontSize: 13, color: '#D97706', fontWeight: 'bold', marginTop: 2 },

  statusBar: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statusBarActive: { backgroundColor: '#FFFBEB' },
  statusBarSold: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 13, fontWeight: '600', color: '#92400E', textAlign: 'center' },
  statusTextSold: { color: '#047857' },
  meetupStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  meetupActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  meetupActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  meetupProposeBtn: { backgroundColor: '#1D4ED8' },
  meetupConfirmBtn: { backgroundColor: '#047857' },
  meetupActionBtnDisabled: { opacity: 0.7 },
  meetupActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  blockedBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  blockedBannerText: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },

  confirmSaleBtn: {
    backgroundColor: '#047857',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  confirmSaleBtnDisabled: { opacity: 0.7 },
  confirmSaleBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },

  rateActionBtn: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  rateActionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },

  ratedBanner: {
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  ratedBannerText: { color: '#6B7280', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  buyIntentBtn: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  buyIntentBtnDisabled: { opacity: 0.7 },
  buyIntentBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },

  buyIntentSentBanner: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  buyIntentSentText: { color: '#047857', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  chatArea: { flex: 1 },
  chatContent: { padding: 15, paddingBottom: 20, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyChatText: { color: '#9CA3AF', fontSize: 15, textAlign: 'center' },
  emptyChatHint: { color: '#D97706', fontSize: 13, marginTop: 10, textAlign: 'center' },

  systemCard: {
    alignSelf: 'center',
    maxWidth: '92%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  systemCardIcon: { fontSize: 20, marginBottom: 6 },
  systemCardText: { fontSize: 14, color: '#92400E', fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  systemCardTime: { fontSize: 10, color: '#B45309', marginTop: 6 },

  messageWrapper: { flexDirection: 'row', marginBottom: 15, maxWidth: '85%' },
  messageWrapperMe: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageWrapperSeller: { alignSelf: 'flex-start' },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarText: { color: '#D97706', fontWeight: 'bold', fontSize: 14 },

  messageBubble: { padding: 12, borderRadius: 18 },
  messageBubbleMe: { backgroundColor: '#D97706', borderBottomRightRadius: 4 },
  messageBubbleSeller: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEEEE', borderBottomLeftRadius: 4 },

  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextMe: { color: '#FFFFFF' },
  messageTextSeller: { color: '#111111' },

  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255,255,255,0.7)' },
  messageTimeSeller: { color: '#9CA3AF' },

  quickReplySection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
    paddingBottom: 4,
  },
  quickReplyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  quickReplyRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReplyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickReplyChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    minHeight: 45,
    maxHeight: 100,
  },
  sendButton: { marginLeft: 12, backgroundColor: '#D97706', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  sendButtonDisabled: { backgroundColor: '#F3F4F6' },
  sendButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  sendButtonTextDisabled: { color: '#9CA3AF' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111111', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  modalLabel: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  modalChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  modalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalChipActive: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  modalChipText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  modalChipTextActive: { color: '#1D4ED8' },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelBtnText: { color: '#4B5563', fontWeight: 'bold', fontSize: 15 },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: { opacity: 0.7 },
  modalSubmitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
