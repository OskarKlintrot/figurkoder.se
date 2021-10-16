using Figurkoder.Domain;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Reactive.Testing;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reactive.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace Figurkoder.UnitTests.Domain
{
    public class GameEngineFacts
    {
        private readonly ITestOutputHelper _outputHelper;

        public GameEngineFacts(ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;
        }

        #region Start
        [Fact]
        public void Start_NoFlashcardsProvided_ThrowArgumentException()
        {
            // Arrange

            // Act
            var exception = Record.Exception(()
                => CreateGameEnginge(100, Array.Empty<Flashcard>()));

            // Assert
            Assert.IsType<ArgumentException>(exception);
            Assert.Equal("Missing flashcards! (Parameter 'settings')", exception.Message);
        }

        [Fact]
        public void Start_GameStarts_StateChangesToRunningAsync()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<StateChangedEvent>();

            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });

            gameEngine.Events.OfType<StateChangedEvent>().Subscribe(observer);

            // Act
            gameEngine.Start();

            // Assert
            var stateChangedEvent = observer.Messages.Single().Value.Value;
            Assert.Equal(GameEngine.State.Running, stateChangedEvent.CurrentState);
        }

        [Fact]
        public void Start_GameStarts_NextFlashcardEventIsDispatched()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<GameEventBase>();

            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });

            gameEngine.Events.Subscribe(observer);

            // Act
            gameEngine.Start();

            // Assert
            var nextFlashcardEvent = (NextFlashcardEvent)observer.Messages.Last().Value.Value;
            Assert.Equal(1, nextFlashcardEvent.Count);
            Assert.Equal("Foo", nextFlashcardEvent.Current.Key);
            Assert.Equal("Bar", nextFlashcardEvent.Current.Mnemonic);
        }

        [Fact]
        public async Task Start_GameEnds_GameFinishedEventTriggersAsync()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50, new[] { new Flashcard("Foo", "Bar") });

            var events = gameEngine.Events.OfType<GameFinishedEvent>().Replay();

            events.Connect();

            // Act
            gameEngine.Start();

            // Assert
            _ = await events.SingleAsync();
        }

        [Fact]
        public async Task Start_GameEnds_ResultAsync()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Bar", "Foo")
                });

            var events = gameEngine.Events.OfType<GameFinishedEvent>().Replay();

            events.Connect();

            // Act
            gameEngine.Start();

            // Assert
            var gameFinishedEvent = await events.SingleAsync();
            Assert.Equal(2, gameFinishedEvent?.Results.Length);

            Assert.Equal("Foo", gameFinishedEvent?.Results[0].Flashcard.Key);
            Assert.Equal("Bar", gameFinishedEvent?.Results[0].Flashcard.Mnemonic);
            Assert.Null(gameFinishedEvent?.Results[0].Time);

            Assert.Equal("Bar", gameFinishedEvent?.Results[1].Flashcard.Key);
            Assert.Equal("Foo", gameFinishedEvent?.Results[1].Flashcard.Mnemonic);
            Assert.Null(gameFinishedEvent?.Results[1].Time);

            Assert.Null(gameFinishedEvent?.Average);
        }

        [Fact]
        public void Start_TimesUp_CurrentEventTriggers()
        {
            // Arrange
            var counter = 0;
            var gameEngine = CreateGameEnginge(100,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Foo", "bAr")
                });
            var sw = new Stopwatch();

            gameEngine.Events.OfType<NextFlashcardEvent>().Subscribe(NextFlashcardEventHandler);

            void NextFlashcardEventHandler(NextFlashcardEvent @event)
            {
                counter++;

                if (counter == 1)
                {
                    sw.Start();
                }
                else if (counter == 2)
                {
                    sw.Stop();
                }
                else
                {
                    throw new NotSupportedException($"Current should only be triggered 2 times, not {counter}.");
                }
            }

            // Act
            gameEngine.Start();

            // Assert
            gameEngine.Events.Wait();
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow ±20ms
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(2)]
        [InlineData(3)]
        [InlineData(4)]
        [InlineData(5)]
        [InlineData(6)]
        [InlineData(7)]
        [InlineData(8)]
        [InlineData(9)]
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "xUnit1026:Theory methods should use all of their parameters", Justification = "Run test 10 times to make sure order is respected")]
        public void Start_TwoFlashcard_NextFlashcardEventDispatchedTwoTimes(int _)
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<NextFlashcardEvent>();

            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("FirstKey", "FirstValue"),
                    new Flashcard("SecondKey", "SecondValue")
                });

            gameEngine.Events
                .OfType<NextFlashcardEvent>()
                .Subscribe(observer);

            // Act
            gameEngine.Start();

            // Assert
            gameEngine.Events.Wait();

            var events = observer.Messages
                .Where(x => x.Value.HasValue)
                .Select(x => x.Value.Value)
                .ToArray();

            Assert.Equal(1, events[0].Count);
            Assert.Equal("FirstKey", events[0].Current.Key);
            Assert.Equal("FirstValue", events[0].Current.Mnemonic);

            Assert.Equal(2, events[1].Count);
            Assert.Equal("SecondKey", events[1].Current.Key);
            Assert.Equal("SecondValue", events[1].Current.Mnemonic);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Start_Randomize_RandomizeOrder(bool randomize)
        {
            // Arrange
            var flashcards = Enumerable
                .Range(0, 49)
                .Select(x => new Flashcard(x.ToString(), x.ToString()))
                .ToArray();

            var showedFlashcards = new List<Flashcard>(flashcards.Length);

            var gameEngine = CreateGameEnginge(10, flashcards, randomize);

            gameEngine.Events
                .OfType<NextFlashcardEvent>()
                .Subscribe(e => showedFlashcards.Add(e.Current));

            // Act
            gameEngine.Start();

            // Assert
            gameEngine.Events.Wait();
            Assert.Equal(flashcards.Length, showedFlashcards.Count);
            Assert.NotEqual(randomize, flashcards.SequenceEqual(showedFlashcards));
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void Start_Randomize_ResultInSameOrderAsShowedFlashcards(bool randomize)
        {
            // Arrange
            var flashcards = Enumerable
                .Range(0, 49)
                .Select(x => new Flashcard(x.ToString(), x.ToString()))
                .ToArray();

            var showedFlashcards = new List<Flashcard>(flashcards.Length);

            var gameEngine = CreateGameEnginge(10, flashcards, randomize);

            gameEngine.Events
                .OfType<NextFlashcardEvent>()
                .Subscribe(e => showedFlashcards.Add(e.Current));

            var results = Array.Empty<Result>();

            gameEngine.Events
                .OfType<GameFinishedEvent>()
                .Subscribe(e => results = e.Results);

            // Act
            gameEngine.Start();

            // Assert
            gameEngine.Events.Wait();
            Assert.True(showedFlashcards.SequenceEqual(results.Select(x => x.Flashcard)));
        }
        #endregion

        #region Next
        [Fact]
        public async Task Next_BeforeTimesUp_NextFlashcardEventDispatched()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(1000, new[] { new Flashcard("Foo", "Bar"), new Flashcard("Foo", "bAr") });

            var counter = 0;
            var sw = new Stopwatch();
            gameEngine.Events
                .OfType<NextFlashcardEvent>()
                .Subscribe(NextFlashcardEventHandler);

            void NextFlashcardEventHandler(NextFlashcardEvent e)
            {
                counter++;

                if (counter == 1)
                {
                    sw.Start();
                }
                else if (counter == 2)
                {
                    sw.Stop();
                }
                else
                {
                    throw new NotSupportedException($"Current should only be triggered 2 times, not {counter}.");
                }
            }

            gameEngine.Start();

            // Act
            await Task.Delay(100);
            gameEngine.Next();

            // Assert
            gameEngine.Events.Wait();
            Assert.False(sw.IsRunning);
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow ±20ms
        }

        [Fact]
        public async Task Next_GameEnds_Result()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(500, new[] { new Flashcard("Foo", "Bar"), new Flashcard("Bar", "Foo"), new Flashcard("Fuu", "bar") });

            var eventStream = gameEngine.Events
                .OfType<GameFinishedEvent>()
                .Replay();

            eventStream.Connect();

            gameEngine.Start();

            // Act
            await Task.Delay(200);
            gameEngine.Next();
            await Task.Delay(100);
            gameEngine.Next();

            // Assert
            var gameFinishedEvent = await eventStream.SingleAsync();
            Assert.Equal(3, gameFinishedEvent?.Results.Length);

            Assert.Equal("Foo", gameFinishedEvent?.Results[0].Flashcard.Key);
            Assert.Equal("Bar", gameFinishedEvent?.Results[0].Flashcard.Mnemonic);
            Assert.InRange(gameFinishedEvent?.Results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(170), TimeSpan.FromMilliseconds(230)); // Allow ±30ms

            Assert.Equal("Bar", gameFinishedEvent?.Results[1].Flashcard.Key);
            Assert.Equal("Foo", gameFinishedEvent?.Results[1].Flashcard.Mnemonic);
            Assert.InRange(gameFinishedEvent?.Results[1].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(130)); // Allow ±30ms

            Assert.Equal("Fuu", gameFinishedEvent?.Results[2].Flashcard.Key);
            Assert.Equal("bar", gameFinishedEvent?.Results[2].Flashcard.Mnemonic);
            Assert.Null(gameFinishedEvent?.Results[2].Time);

            Assert.InRange(gameFinishedEvent?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(120), TimeSpan.FromMilliseconds(180)); // Allow ±30ms
        }
        #endregion

        #region Reveale
        [Fact]
        public void Reveale_GameStartedRevealeCard_StateIsRevealed()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<StateChangedEvent>();

            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });

            gameEngine.Events.OfType<StateChangedEvent>().Subscribe(observer);

            gameEngine.Start();

            // Act
            gameEngine.Reveale();

            // Assert
            var stateChangedEvent = observer.Messages.Last().Value.Value;
            Assert.Equal(GameEngine.State.Revealed, stateChangedEvent.CurrentState);
        }
        #endregion
        
        #region Pause
        [Fact]
        public void Pause_GameStartedPauseGame_StateIsPaused()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<StateChangedEvent>();

            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });

            gameEngine.Events.OfType<StateChangedEvent>().Subscribe(observer);

            gameEngine.Start();

            // Act
            gameEngine.Pause();

            // Assert
            var states = observer.Messages.Select(x => x.Value.Value.CurrentState).ToArray();
            Assert.Equal(GameEngine.State.Running, states[0]);
            Assert.Equal(GameEngine.State.Paused, states[1]);
        }
        #endregion

        #region Resume
        [Fact]
        public void Start_GamePaused_StateIsRunning()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<StateChangedEvent>();

            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });

            gameEngine.Events.OfType<StateChangedEvent>().Subscribe(observer);

            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Start();

            // Assert
            var states = observer.Messages.Select(x => x.Value.Value.CurrentState).ToArray();
            Assert.Equal(GameEngine.State.Running, states[0]);
            Assert.Equal(GameEngine.State.Paused, states[1]);
            Assert.Equal(GameEngine.State.Running, states[2]);
        }
        #endregion

        #region Stop
        [Fact]
        public void Stop_GameStartedStopGame_StateIsFinished()
        {
            // Arrange
            var observer = new TestScheduler().CreateObserver<StateChangedEvent>();

            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });

            gameEngine.Events.OfType<StateChangedEvent>().Subscribe(observer);

            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            var states = observer.Messages.Where(x => x.Value.HasValue).Select(x => x.Value.Value.CurrentState).ToArray();
            Assert.Equal(GameEngine.State.Running, states[0]);
            Assert.Equal(GameEngine.State.Finished, states[1]);
        }

        [Fact]
        public void Stop_StopGame_ResultIncludesAllFlashcards()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Foo", "bAr"),
                    new Flashcard("Foo", "baR")
                });
            
            var result = Array.Empty<Result>();
            
            gameEngine.Events.OfType<GameFinishedEvent>().Subscribe(e => result = e.Results);

            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.Equal(3, result.Length);
        }

        [Fact]
        public void Stop_StopGame_TimeIsNullOnResult()
        {
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Foo", "bAr"),
                    new Flashcard("Foo", "baR")
                });

            var result = Array.Empty<Result>();

            gameEngine.Events.OfType<GameFinishedEvent>().Subscribe(e => result = e.Results);

            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.All(result, x => Assert.Null(x.Time));
        }

        [Fact]
        public void Stop_StopGameBeforeAnyNext_AvarageIsNull()
        {
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Foo", "bAr"),
                    new Flashcard("Foo", "baR")
                });

            TimeSpan? average = TimeSpan.Zero;

            gameEngine.Events.OfType<GameFinishedEvent>().Subscribe(e => average = e.Average);

            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.Null(average);
        }
        #endregion

        private GameEngine CreateGameEnginge(int ms, Flashcard[] flashcards, bool randomize = false)
            => new ServiceCollection()
                .AddLogging((builder) =>
                {
                    builder
                        .SetMinimumLevel(LogLevel.Debug)
                        .AddXUnit(_outputHelper);
                })
                .AddSingleton<GameEngineFactory>()
                .BuildServiceProvider()
                .GetRequiredService<GameEngineFactory>()
                .Create(
                    new Game(
                        TimeSpan.FromMilliseconds(ms),
                        flashcards,
                        randomize));
    }
}
