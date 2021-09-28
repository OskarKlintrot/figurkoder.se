using Figurkoder.Domain;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
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
        public void Start_GameStarts_StateChangesToRunning()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });
            GameEngine.State state = GameEngine.State.NotStarted;
            var stateChangedReceived = new AutoResetEvent(false);
            gameEngine.CurrentState += StateChangedHandler;

            void StateChangedHandler(object? _, StateEventArgs e)
            {
                state = e.CurrentState;
                stateChangedReceived.Set();
            }

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(10)));
            Assert.Equal(GameEngine.State.Running, state);
        }

        [Fact]
        public void Start_GameStarts_CurrentEventTriggers()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(100, new[] { new Flashcard("Foo", "Bar") });
            var currentReceived = new AutoResetEvent(false);
            CurrentEventArgs? currentEventArgs = null;
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, CurrentEventArgs e)
            {
                currentEventArgs = e;
                currentReceived.Set();
            }

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(10))); // 10 ms to make sure the enginge never have a chance to trigger Current based on timer elapsed
            Assert.Equal(1, currentEventArgs?.Count);
            Assert.Equal("Foo", currentEventArgs?.Current.Key);
            Assert.Equal("Bar", currentEventArgs?.Current.Mnemonic);
        }

        [Fact]
        public void Start_GameEnds_GameFinishedEventTriggers()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(50, new[] { new Flashcard("Foo", "Bar") });
            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, EventArgs e)
            {
                finishedReceived.Set();
            }

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(75)));
        }

        [Fact]
        public void Start_GameEnds_Result()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Bar", "Foo")
                });
            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;
            GameFinishedEventArgs? gameFinishedEventArgs = null;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                gameFinishedEventArgs = e;
                finishedReceived.Set();
            }

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.Equal(2, gameFinishedEventArgs?.Results.Length);

            Assert.Equal("Foo", gameFinishedEventArgs?.Results[0].Flashcard.Key);
            Assert.Equal("Bar", gameFinishedEventArgs?.Results[0].Flashcard.Mnemonic);
            Assert.Null(gameFinishedEventArgs?.Results[0].Time);

            Assert.Equal("Bar", gameFinishedEventArgs?.Results[1].Flashcard.Key);
            Assert.Equal("Foo", gameFinishedEventArgs?.Results[1].Flashcard.Mnemonic);
            Assert.Null(gameFinishedEventArgs?.Results[1].Time);

            Assert.Null(gameFinishedEventArgs?.Average);
        }

        [Fact]
        public void Start_TimesUp_CurrentEventTriggers()
        {
            // Arrange
            var currentCounter = 0;
            var gameEngine = CreateGameEnginge(100,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Foo", "bAr")
                });
            var sw = new Stopwatch();
            var currentReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, EventArgs e)
            {
                currentCounter++;

                if (currentCounter == 1)
                {
                    sw.Start();
                }
                else if (currentCounter == 2)
                {
                    sw.Stop();
                    currentReceived.Set();
                }
                else
                {
                    throw new NotSupportedException($"Current should only be triggered 2 times, not {currentCounter}.");
                }
            }

            // Act
            gameEngine.Start();

            // Assert
            currentReceived.WaitOne(TimeSpan.FromMilliseconds(115));
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow �20ms
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
        public void Start_TwoFlashcard_CurrentEventTriggersTwoTimes(int _)
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("FirstKey", "FirstValue"),
                    new Flashcard("SecondKey", "SecondValue")
                });
            CurrentEventArgs? currentEventArgs = null;
            var currentReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, CurrentEventArgs e)
            {
                currentEventArgs = e;
                currentReceived.Set();
            }

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(30)));
            Assert.Equal(1, currentEventArgs?.Count);
            Assert.Equal("FirstKey", currentEventArgs?.Current.Key);
            Assert.Equal("FirstValue", currentEventArgs?.Current.Mnemonic);

            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(30)));
            Assert.Equal(2, currentEventArgs?.Count);
            Assert.Equal("SecondKey", currentEventArgs?.Current.Key);
            Assert.Equal("SecondValue", currentEventArgs?.Current.Mnemonic);
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

            var endReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;
            gameEngine.GameFinished += GameFinishedHandler;

            void CurrentHandler(object? _, CurrentEventArgs e)
            {
                showedFlashcards.Add(e.Current);
            }

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                endReceived.Set();
            }

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(endReceived.WaitOne(TimeSpan.FromMilliseconds(2000)));
            Assert.Equal(flashcards.Length, showedFlashcards.Count);
            Assert.NotEqual(randomize, flashcards.SequenceEqual(showedFlashcards));
        }

        //[Theory]
        //[InlineData(true)]
        //[InlineData(false)]
        //public void Start_Randomize_DoNotRandomizeResult(bool randomize)
        //{
        //    // Arrange
        //    var flashcards = new[]
        //    {
        //        new Flashcard("FirstKey", "FirstValue"),
        //        new Flashcard("SecondKey", "SecondValue"),
        //        new Flashcard("ThirdKey", "ThirdValue"),
        //        new Flashcard("FourthKey", "FourthValue")
        //    };

        //    var gameEngine = new GameEngine(new Game(
        //        TimeSpan.FromMilliseconds(10),
        //        flashcards,
        //        randomize));

        //    GameFinishedEventArgs? gameFinishedEventArgs = null;
        //    var endReceived = new AutoResetEvent(false);
        //    gameEngine.GameFinished += GameFinishedHandler;

        //    void GameFinishedHandler(object? _, GameFinishedEventArgs e)
        //    {
        //        gameFinishedEventArgs = e;
        //        endReceived.Set();
        //    }

        //    // Act
        //    gameEngine.Start();

        //    // Assert
        //    Assert.True(endReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
        //    Assert.Null(gameFinishedEventArgs?.Average);
        //    Assert.True(flashcards.SequenceEqual(gameFinishedEventArgs?.Results.Select(x => x.Flashcard)!));
        //}
        #endregion

        #region Next
        [Fact]
        public async Task Next_BeforeTimesUp_CurrentEventTriggers()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(1000, new[] { new Flashcard("Foo", "Bar"), new Flashcard("Foo", "bAr") });

            var currentCounter = 0;
            var sw = new Stopwatch();
            var currentReceived = new AutoResetEvent(false);
            gameEngine.Current += CurrentHandler;

            void CurrentHandler(object? _, EventArgs e)
            {
                currentCounter++;

                if (currentCounter == 1)
                {
                    sw.Start();
                }
                else if (currentCounter == 2)
                {
                    sw.Stop();
                    currentReceived.Set();
                }
                else
                {
                    throw new NotSupportedException($"Current should only be triggered 2 times, not {currentCounter}.");
                }
            }

            gameEngine.Start();

            // Act
            await Task.Delay(100);
            gameEngine.Next();

            // Assert
            currentReceived.WaitOne(TimeSpan.FromMilliseconds(115));
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(120)); // Allow �20ms
        }

        [Fact]
        public async Task Next_GameEnds_Result()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(500, new[] { new Flashcard("Foo", "Bar"), new Flashcard("Bar", "Foo"), new Flashcard("Fuu", "bar") });

            var finishedReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;
            GameFinishedEventArgs? gameFinishedEventArgs = null;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                gameFinishedEventArgs = e;
                finishedReceived.Set();
            }

            gameEngine.Start();

            // Act
            await Task.Delay(200);
            gameEngine.Next();
            await Task.Delay(100);
            gameEngine.Next();

            // Assert
            Assert.True(finishedReceived.WaitOne(TimeSpan.FromMilliseconds(1000)));
            Assert.Equal(3, gameFinishedEventArgs?.Results.Length);

            Assert.Equal("Foo", gameFinishedEventArgs?.Results[0].Flashcard.Key);
            Assert.Equal("Bar", gameFinishedEventArgs?.Results[0].Flashcard.Mnemonic);
            Assert.InRange(gameFinishedEventArgs?.Results[0].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(170), TimeSpan.FromMilliseconds(230)); // Allow �30ms

            Assert.Equal("Bar", gameFinishedEventArgs?.Results[1].Flashcard.Key);
            Assert.Equal("Foo", gameFinishedEventArgs?.Results[1].Flashcard.Mnemonic);
            Assert.InRange(gameFinishedEventArgs?.Results[1].Time ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(80), TimeSpan.FromMilliseconds(130)); // Allow �30ms

            Assert.Equal("Fuu", gameFinishedEventArgs?.Results[2].Flashcard.Key);
            Assert.Equal("bar", gameFinishedEventArgs?.Results[2].Flashcard.Mnemonic);
            Assert.Null(gameFinishedEventArgs?.Results[2].Time);

            Assert.InRange(gameFinishedEventArgs?.Average ?? TimeSpan.Zero, TimeSpan.FromMilliseconds(120), TimeSpan.FromMilliseconds(180)); // Allow �30ms
        }
        #endregion

        #region Reveale
        [Fact]
        public void Reveale_GameStartedRevealeCard_StateIsRevealed()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10, new[] { new Flashcard("Foo", "Bar") });
            GameEngine.State state = GameEngine.State.NotStarted;
            var stateChangedReceived = new AutoResetEvent(false);
            gameEngine.CurrentState += StateChangedHandler;

            void StateChangedHandler(object? _, StateEventArgs e)
            {
                state = e.CurrentState;
                stateChangedReceived.Set();
            }
            gameEngine.Start();

            // Act
            gameEngine.Reveale();

            // Assert
            Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Revealed, state);
        }
        #endregion
        
        #region Pause
        [Fact]
        public void Pause_GameStartedPauseGame_StateIsPaused()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10, new[] { new Flashcard("Foo", "Bar") });
            GameEngine.State state = GameEngine.State.NotStarted;
            var stateChangedReceived = new AutoResetEvent(false);
            gameEngine.CurrentState += StateChangedHandler;

            void StateChangedHandler(object? _, StateEventArgs e)
            {
                state = e.CurrentState;
                stateChangedReceived.Set();
            }
            gameEngine.Start();

            // Act
            gameEngine.Pause();

            // Assert
            Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Paused, state);
        }
        #endregion

        #region Resume
        [Fact]
        public void Start_GamePaused_StateIsRunning()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(1000, new[] { new Flashcard("Foo", "Bar") });
            GameEngine.State state = GameEngine.State.NotStarted;
            var stateChangedReceived = new AutoResetEvent(false);
            gameEngine.CurrentState += StateChangedHandler;

            void StateChangedHandler(object? _, StateEventArgs e)
            {
                state = e.CurrentState;
                stateChangedReceived.Set();
            }
            gameEngine.Start();
            gameEngine.Pause();

            // Act
            gameEngine.Start();

            // Assert
            Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Running, state);
        }
        #endregion

        #region Stop
        [Fact]
        public void Stop_GameStartedStopGame_StateIsFinished()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10, new[] { new Flashcard("Foo", "Bar") });
            GameEngine.State state = GameEngine.State.NotStarted;
            var stateChangedReceived = new AutoResetEvent(false);
            gameEngine.CurrentState += StateChangedHandler;

            void StateChangedHandler(object? _, StateEventArgs e)
            {
                state = e.CurrentState;
                stateChangedReceived.Set();
            }
            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(stateChangedReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.Equal(GameEngine.State.Finished, state);
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
            var resultReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                result = e.Results;
                resultReceived.Set();
            }
            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(resultReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.Equal(3, result.Length);
        }

        [Fact]
        public void Stop_StopGame_TimeIsNullOnResult()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Foo", "BAr"),
                    new Flashcard("Foo", "baR")
                });
            var result = Array.Empty<Result>();
            var resultReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                result = e.Results;
                resultReceived.Set();
            }
            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(resultReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
            Assert.All(result, x => Assert.Null(x.Time));
        }

        [Fact]
        public void Stop_StopGameBeforeAnyNext_AvarageIsNull()
        {
            // Arrange
            var gameEngine = CreateGameEnginge(10,
                new[]
                {
                    new Flashcard("Foo", "Bar"),
                    new Flashcard("Foo", "BAr"),
                    new Flashcard("Foo", "baR")
                });

            TimeSpan? average = TimeSpan.Zero;
            var resultReceived = new AutoResetEvent(false);
            gameEngine.GameFinished += GameFinishedHandler;

            void GameFinishedHandler(object? _, GameFinishedEventArgs e)
            {
                average = e.Average;
                resultReceived.Set();
            }
            gameEngine.Start();

            // Act
            gameEngine.Stop();

            // Assert
            Assert.True(resultReceived.WaitOne(TimeSpan.FromMilliseconds(100)));
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
