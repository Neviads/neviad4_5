package com.neviad.beneviadsystem.infrastructure.ai;

import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.function.FunctionToolCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Without the lock, agents that build their tools at once fail the first time they meet an input type
 * ("Conflicting property-based creators ... (1 arg)"): Spring AI generates the schema with a generator shared between threads.
 */
class ToolSchemaLockTest {
    record T0(String text) { }
    record T1(String text) { }
    record T2(String text) { }
    record T3(String text) { }
    record T4(String text) { }
    record T5(String text) { }
    record T6(String text) { }
    record T7(String text) { }
    record T8(String text) { }
    record T9(String text) { }
    record T10(String text) { }
    record T11(String text) { }
    record T12(String text) { }
    record T13(String text) { }
    record T14(String text) { }
    record T15(String text) { }
    record T16(String text) { }
    record T17(String text) { }
    record T18(String text) { }
    record T19(String text) { }
    record T20(String text) { }
    record T21(String text) { }
    record T22(String text) { }
    record T23(String text) { }
    record T24(String text) { }
    record T25(String text) { }
    record T26(String text) { }
    record T27(String text) { }
    record T28(String text) { }
    record T29(String text) { }

    private static final List<Class<?>> TYPES = List.of(T0.class, T1.class, T2.class, T3.class, T4.class, T5.class, T6.class, T7.class, T8.class, T9.class, T10.class, T11.class, T12.class, T13.class, T14.class, T15.class, T16.class, T17.class, T18.class, T19.class, T20.class, T21.class, T22.class, T23.class, T24.class, T25.class, T26.class, T27.class, T28.class, T29.class);

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void toolsBuiltByManyThreadsAtOnceAllSucceed() throws Exception {
        AtomicReference<Throwable> failure = new AtomicReference<>();
        for (Class<?> type : TYPES) {
            CountDownLatch go = new CountDownLatch(1);
            List<Thread> threads = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                Thread thread = new Thread(() -> {
                    try {
                        go.await();
                        ToolSchemaLock.build(() -> FunctionToolCallback.builder("append_note", (Function) input -> "ok").description("d").inputType(type).build());
                    } catch (Throwable error) {
                        failure.compareAndSet(null, error);
                    }
                });
                threads.add(thread);
                thread.start();
            }
            go.countDown();
            for (Thread thread : threads) thread.join();
        }
        assertThat(failure.get()).isNull();
    }
}
